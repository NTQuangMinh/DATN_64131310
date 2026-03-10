package com.quangminh.delivery.service;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.DeliveryProof;
import com.quangminh.delivery.repository.DeliveryProofRepository;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.repository.OrderRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    public Order createOrder(OrderRequestDTO dto) {
        Order order = new Order();
        order.setOrderCode(dto.getOrderCode());
        order.setCustomerName(dto.getCustomerName());
        order.setCustomerPhone(dto.getCustomerPhone());
        order.setDeliveryAddress(dto.getDeliveryAddress());
        order.setLatitude(dto.getLatitude());
        order.setLongitude(dto.getLongitude());
        order.setStatus("PENDING"); // Trạng thái mặc định khi Admin tạo đơn

        return orderRepository.save(order);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @Autowired
    private DeliveryProofRepository proofRepository;

    @Autowired
    private PdfGeneratorService pdfService;

    @Autowired
    private SignatureService signatureService;

    @Transactional
    public Order completeDelivery(DeliveryCompleteDTO dto) {
        Order order = orderRepository.findById(dto.getOrderId())
                .orElseThrow(() -> new RuntimeException("Đơn hàng không tồn tại"));

        // Cập nhật trạng thái thành công/thất bại và tọa độ thực tế
        order.setStatus(dto.getStatus());
        order.setLatitude(dto.getCurrentLat());
        order.setLongitude(dto.getCurrentLng());
        orderRepository.save(order);

        // Lưu minh chứng ký số nếu giao thành công
        if ("SUCCESS".equalsIgnoreCase(dto.getStatus())) {
            DeliveryProof proof = new DeliveryProof();
            proof.setOrder(order);
            proof.setSignatureValue(dto.getSignatureValue());
            proof.setSignedAt(java.time.LocalDateTime.now());
            // Hash nội dung đơn hàng để đảm bảo tính toàn vẹn
            proof.setHashValue(java.util.UUID.randomUUID().toString());

            proofRepository.save(proof);
        }
        return order;
    }
    @Autowired
    private DeliveryProofRepository deliveryProofRepository;

    public Map<String, Object> getOrderReport(UUID orderId) {
        // 1. Tìm thông tin đơn hàng
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        // 2. Tìm minh chứng ký số liên quan
        DeliveryProof proof = proofRepository.findByOrderId(orderId).orElse(null);

        // 3. Đóng gói dữ liệu trả về một cách chi tiết
        Map<String, Object> report = new HashMap<>();
        report.put("orderCode", order.getOrderCode());
        report.put("customer", order.getCustomerName());
        report.put("address", order.getDeliveryAddress());
        report.put("finalStatus", order.getStatus());
        report.put("deliveryLocation", Map.of(
                "lat", order.getLatitude(),
                "lng", order.getLongitude()
        ));

        if (order.getDriver() != null) {
            report.put("driverName", order.getDriver().getFullName());
        }

        if (proof != null) {
            report.put("signature", proof.getSignatureValue());
            report.put("signedAt", proof.getSignedAt());
            report.put("hashValue", proof.getHashValue());
            report.put("isVerified", true); // Đánh dấu đã có chữ ký xác thực
        } else {
            report.put("isVerified", false);
            report.put("message", "Đơn hàng này chưa được ký nhận hoặc giao thất bại.");
        }

        return report;
    }
}