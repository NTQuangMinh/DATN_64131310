package com.quangminh.delivery.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.AuditLog;
import com.quangminh.delivery.entity.DeliveryProof;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.repository.AuditLogRepository;
import com.quangminh.delivery.repository.DeliveryProofRepository;
import com.quangminh.delivery.repository.OrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DeliveryProofRepository proofRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Order createOrder(OrderRequestDTO dto) {
        long currentOrderCount = orderRepository.count();
        String nextNumber = String.format("%03d", currentOrderCount + 1);
        String autoCode = "ORD-" + nextNumber;

        Order order = new Order();
        order.setOrderCode(autoCode);
        order.setCustomerName(dto.getCustomerName());
        order.setCustomerPhone(dto.getCustomerPhone());
        order.setDeliveryAddress(dto.getDeliveryAddress());
        order.setLatitude(dto.getLatitude());
        order.setLongitude(dto.getLongitude());
        order.setStatus("PENDING");
        order.setCreatedAt(LocalDateTime.now());

        Order savedOrder = orderRepository.save(order);

        // Đẩy logic WebSocket xuống Service
        if (savedOrder.getDriver() != null) {
            messagingTemplate.convertAndSend("/topic/driver/" + savedOrder.getDriver().getId(), savedOrder);
        }
        return savedOrder;
    }

    public Order getOrderById(UUID id) {
        return orderRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + id));
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByDriverId(UUID driverId) {
        return orderRepository.findByDriverIdAndStatusIn(driverId, List.of("ASSIGNED", "DELIVERING"));
    }

    @Transactional
    public void processCheckIn(UUID id, String driverId, double lat, double lng) {
        Order order = getOrderById(id);
        String logDetail = String.format("Tài xế [ID: %s] CHECK-IN tại đơn [%s]. GPS: %f, %f", driverId, order.getOrderCode(), lat, lng);
        auditLogRepository.save(new AuditLog("CHECK_IN", driverId, logDetail));
    }

    @Transactional
    public Order updateOrderStatus(UUID id, String status) {
        Order order = getOrderById(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }

    // Đã gộp 2 hàm completeDelivery thành 1 hàm duy nhất, chuẩn xác
    @Transactional
    public Order completeDelivery(UUID orderId, DeliveryCompleteDTO dto) {
        Order order = getOrderById(orderId);
        order.setStatus(dto.getStatus());
        order.setActualLatitude(dto.getActualLatitude());
        order.setActualLongitude(dto.getActualLongitude());
        order.setCheckInTime(LocalDateTime.now());
        order.setEvidenceImage(dto.getEvidenceImage());
        order.setFailureReason(dto.getFailureReason());
        Order savedOrder = orderRepository.save(order);

        if ("SUCCESS".equalsIgnoreCase(dto.getStatus())) {
            DeliveryProof proof = new DeliveryProof();
            proof.setOrder(savedOrder);
            proof.setSignatureValue(dto.getSignatureValue());
            proof.setSignedAt(LocalDateTime.now());
            proof.setHashValue(UUID.randomUUID().toString());
            proofRepository.save(proof);
        }
        return savedOrder;
    }

    public Map<String, Object> getDashboardStats() {
        List<Order> allOrders = orderRepository.findAll();
        long total = allOrders.size();
        long delivered = allOrders.stream().filter(o -> "DELIVERED".equals(o.getStatus()) || "SUCCESS".equals(o.getStatus())).count();
        long canceled = allOrders.stream().filter(o -> "CANCELED".equals(o.getStatus())).count();
        long delivering = allOrders.stream().filter(o -> "DELIVERING".equals(o.getStatus())).count();
        long assigned = allOrders.stream().filter(o -> "ASSIGNED".equals(o.getStatus())).count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalOrders", total);
        stats.put("deliveredOrders", delivered);
        stats.put("canceledOrders", canceled);
        stats.put("deliveringOrders", delivering);
        stats.put("assignedOrders", assigned);
        stats.put("successRate", total == 0 ? 0 : Math.round(((double) delivered / total) * 100.0 * 10.0) / 10.0);

        return stats;
    }

    public Order findByOrderCode(String orderCode) {
        return orderRepository.findByOrderCode(orderCode);
    }

    // Đẩy logic đọc PDF iText7 xuống Service
    public Map<String, Object> verifyPdfDocument(MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        try {
            PdfDocument pdfDoc = new PdfDocument(new PdfReader(file.getInputStream()));
            String pdfText = PdfTextExtractor.getTextFromPage(pdfDoc.getPage(1));
            pdfDoc.close();

            String orderCode = null;
            for (String word : pdfText.split("\\s+")) {
                if (word.startsWith("ORD-")) {
                    orderCode = word.replaceAll("[^a-zA-Z0-9-]", "");
                    break;
                }
            }

            if (orderCode == null) {
                response.put("isValid", false);
                response.put("message", "Không tìm thấy mã đơn hàng hợp lệ. File có thể đã bị làm giả.");
                return response;
            }

            Order order = findByOrderCode(orderCode);
            if (order == null || !"DELIVERED".equals(order.getStatus())) {
                response.put("isValid", false);
                response.put("message", "Đơn hàng không tồn tại hoặc chưa được giao thành công.");
                return response;
            }

            String maskedName = order.getCustomerName().replaceAll("(?<=.{2}).(?=.{2})", "*");
            String maskedPhone = order.getCustomerPhone().replaceAll("(?<=\\d{3})\\d(?=\\d{3})", "*");

            response.put("isValid", true);
            response.put("message", "Biên bản hợp lệ! Chữ ký số khớp với hệ thống.");
            response.put("orderCode", orderCode);
            response.put("customerName", maskedName);
            response.put("customerPhone", maskedPhone);
            response.put("deliveryAddress", order.getDeliveryAddress());

            auditLogRepository.save(new AuditLog("VERIFY", "PUBLIC_USER", "Kiểm chứng PDF đơn " + orderCode));
            return response;

        } catch (Exception e) {
            response.put("isValid", false);
            response.put("message", "Định dạng file không hợp lệ hoặc file bị hỏng.");
            return response;
        }
    }

    public Map<String, Object> getOrderReport(UUID orderId) {
        Order order = getOrderById(orderId);
        DeliveryProof proof = proofRepository.findByOrderId(orderId).orElse(null);

        Map<String, Object> report = new HashMap<>();
        report.put("orderCode", order.getOrderCode());
        report.put("customer", order.getCustomerName());
        report.put("address", order.getDeliveryAddress());
        report.put("finalStatus", order.getStatus());
        report.put("deliveryLocation", Map.of("lat", order.getLatitude(), "lng", order.getLongitude()));

        if (order.getDriver() != null) report.put("driverName", order.getDriver().getFullName());

        if (proof != null) {
            report.put("signature", proof.getSignatureValue());
            report.put("signedAt", proof.getSignedAt());
            report.put("hashValue", proof.getHashValue());
            report.put("isVerified", true);
        } else {
            report.put("isVerified", false);
            report.put("message", "Chưa được ký nhận hoặc giao thất bại.");
        }
        return report;
    }
}