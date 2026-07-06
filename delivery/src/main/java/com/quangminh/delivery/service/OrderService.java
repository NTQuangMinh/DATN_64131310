package com.quangminh.delivery.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.repository.OrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

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
    public Order updateOrderStatus(UUID id, String status) {
        Order order = getOrderById(id);
        order.setStatus(status);
        return orderRepository.save(order);
    }

    @Transactional
    public Order completeDelivery(UUID orderId, DeliveryCompleteDTO dto) {
        Order order = getOrderById(orderId);
        order.setStatus(dto.getStatus());
        order.setActualLatitude(dto.getActualLatitude());
        order.setActualLongitude(dto.getActualLongitude());
        order.setCheckInTime(LocalDateTime.now());
        order.setEvidenceImage(dto.getEvidenceImage());
        order.setFailureReason(dto.getFailureReason());
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    public Map<String, Object> getDashboardStats() {
        List<Order> allOrders = orderRepository.findAll();
        long total = allOrders.size();
        long delivered = allOrders.stream().filter(o -> "DELIVERED".equals(o.getStatus()) || "SUCCESS".equals(o.getStatus())).count();
        long canceled = allOrders.stream().filter(o -> "CANCELED".equals(o.getStatus()) || "FAILED".equals(o.getStatus())).count();
        long delivering = allOrders.stream().filter(o -> "DELIVERING".equals(o.getStatus())).count();
        long assigned = allOrders.stream().filter(o -> "ASSIGNED".equals(o.getStatus())).count();

        // LẤY DANH SÁCH HOẠT ĐỘNG GẦN ĐÂY CỦA TÀI XẾ (MỚI NHẤT -> CŨ NHẤT)
        // Chỉ lấy các đơn đã hoàn thành hoặc thất bại (Có thời gian updatedAt)
        List<Map<String, Object>> recentActivities = allOrders.stream()
                .filter(o -> o.getUpdatedAt() != null && o.getDriver() != null)
                .sorted(Comparator.comparing(Order::getUpdatedAt).reversed()) // Sắp xếp giảm dần theo thời gian
                .limit(10) // Chỉ lấy 10 hoạt động gần nhất để tránh nặng Web
                .map(o -> {
                    Map<String, Object> activity = new HashMap<>();
                    activity.put("orderCode", o.getOrderCode());
                    activity.put("driverName", o.getDriver().getFullName());
                    activity.put("customerName", o.getCustomerName());
                    activity.put("status", o.getStatus());
                    activity.put("timestamp", o.getUpdatedAt());
                    return activity;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalOrders", total);
        stats.put("deliveredOrders", delivered);
        stats.put("canceledOrders", canceled);
        stats.put("deliveringOrders", delivering);
        stats.put("assignedOrders", assigned);
        stats.put("successRate", total == 0 ? 0 : Math.round(((double) delivered / total) * 100.0 * 10.0) / 10.0);

        // Gắn thêm danh sách hoạt động vào payload trả về
        stats.put("recentActivities", recentActivities);

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

            return response;

        } catch (Exception e) {
            response.put("isValid", false);
            response.put("message", "Định dạng file không hợp lệ hoặc file bị hỏng.");
            return response;
        }
    }

    public Map<String, Object> getOrderReport(UUID orderId) {
        Order order = getOrderById(orderId);

        Map<String, Object> report = new HashMap<>();
        report.put("orderCode", order.getOrderCode());
        report.put("customer", order.getCustomerName());
        report.put("address", order.getDeliveryAddress());
        report.put("finalStatus", order.getStatus());
        report.put("deliveryLocation", Map.of("lat", order.getLatitude(), "lng", order.getLongitude()));

        if (order.getDriver() != null) report.put("driverName", order.getDriver().getFullName());

        report.put("isVerified", "DELIVERED".equals(order.getStatus()));

        return report;
    }

}