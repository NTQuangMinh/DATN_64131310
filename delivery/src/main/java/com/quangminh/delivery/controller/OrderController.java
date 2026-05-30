package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.service.OrderCompletionService;
import com.quangminh.delivery.service.OrderService;
import com.quangminh.delivery.service.PdfGeneratorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderCompletionService orderCompletionService;

    @Autowired
    private PdfGeneratorService pdfGeneratorService;

    // Sử dụng @Valid để kích hoạt GlobalExceptionHandler
    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody OrderRequestDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @PostMapping("/{id}/check-in")
    public ResponseEntity<String> checkInAtLocation(
            @PathVariable UUID id,
            @RequestParam String driverId,
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok("Ghi nhận thông tin Check-in thành công!");
    }

    @PostMapping("/{id}/signing-url")
    public ResponseEntity<?> getSigningUrl(@PathVariable UUID id) {
        Order order = orderService.getOrderById(id);
        String url = orderCompletionService.initiateOrderSigning(order);
        return ResponseEntity.ok(Collections.singletonMap("signingUrl", url));
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
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        return ResponseEntity.ok(orderService.getDashboardStats());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Order> completeDelivery(
            @PathVariable UUID id,
            @RequestBody DeliveryCompleteDTO dto) {

        Order completedOrder = orderService.completeDelivery(id, dto);

        try {
            pdfGeneratorService.generateDeliveryReceipt(completedOrder);
        } catch (Exception e) {
            System.err.println("Cảnh báo: Không thể sinh file PDF: " + e.getMessage());
        }

        return ResponseEntity.ok(completedOrder);
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<Map<String, Object>> getOrderReport(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderReport(id));
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<Resource> viewDeliveryReceiptPdf(@PathVariable UUID id) {
        Order order = orderService.getOrderById(id);
        try {
            Path filePath = Paths.get("storage/receipts/").resolve(order.getOrderCode() + ".pdf").normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + order.getOrderCode() + "_receipt.pdf\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/verify-pdf")
    public ResponseEntity<Map<String, Object>> verifyPdf(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(orderService.verifyPdfDocument(file));
    }
}