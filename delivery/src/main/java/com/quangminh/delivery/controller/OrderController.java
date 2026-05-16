package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.service.DocuSignService;
import com.quangminh.delivery.service.OrderCompletionService;
import com.quangminh.delivery.service.OrderService;
import com.quangminh.delivery.service.PdfGeneratorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private DocuSignService docuSignService;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    @Autowired
    private OrderCompletionService orderCompletionService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;


    // 1. Tạo đơn hàng và thông báo Real-time cho tài xế qua WebSocket
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequestDTO dto) {
        Order savedOrder = orderService.createOrder(dto);

        // Gửi thông báo đến topic riêng của tài xế: /topic/driver/{driverId}
        if (savedOrder.getDriver() != null) {
            messagingTemplate.convertAndSend(
                    "/topic/driver/" + savedOrder.getDriver().getId(),
                    savedOrder
            );
        }

        return ResponseEntity.ok(savedOrder);
    }

    // 2. Lấy link ký số DocuSign (Thay thế cho việc ký tay trên App)
    @PostMapping("/{id}/signing-url")
    public ResponseEntity<?> getSigningUrl(@PathVariable UUID id) {
        Order order = orderService.getOrderById(id);
        // Gọi OrderCompletionService để làm mọi việc (Tạo PDF -> Lấy Link)
        String url = orderCompletionService.initiateOrderSigning(order);
        return ResponseEntity.ok(Collections.singletonMap("signingUrl", url));
    }

    // 3. Webhook nhận tín hiệu từ DocuSign khi tài xế ký xong
    @PostMapping("/docusign/webhook")
    public ResponseEntity<String> handleDocuSignWebhook(@RequestBody String xmlData) {
        // DocuSign gửi XML chứa thông tin Envelope
        // Trong đồ án, bạn chỉ cần kiểm tra nếu chuỗi chứa "<Status>Completed</Status>"
        if (xmlData.contains("<Status>Completed</Status>")) {
            // Tìm Order dựa trên thông tin trong XML hoặc dùng cơ chế mapping EnvelopeId
            // Cập nhật trạng thái: order.setStatus(OrderStatus.DELIVERED_SIGNED);
            System.out.println("Đơn hàng đã được ký thành công!");
        }
        return ResponseEntity.ok("Confirmed");
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<List<Order>> getMyTasks(@RequestParam UUID driverId) {
        return ResponseEntity.ok(orderService.getOrdersByDriverId(driverId));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(orderService.getOrderStatistics());
    }

    // Endpoint này giữ lại nhưng bạn sẽ gọi sau khi ảnh minh chứng đã upload xong
    @PostMapping("/{id}/complete")
    public ResponseEntity<Order> completeDelivery(
            @PathVariable UUID id,
            @RequestBody DeliveryCompleteDTO dto) {
        return ResponseEntity.ok(orderService.completeDelivery(id, dto));
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<Map<String, Object>> getOrderReport(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderReport(id));
    }
}