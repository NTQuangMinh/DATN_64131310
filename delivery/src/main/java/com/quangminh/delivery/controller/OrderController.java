package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    // --- API CHO ADMIN ---

    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequestDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // --- API CHO TÀI XẾ (Tuần 6 & 7) ---

    @GetMapping("/my-tasks")
    public ResponseEntity<List<Order>> getMyTasks(@RequestParam UUID driverId) {
        // Tạm thời nhận driverId từ RequestParam để test, sau này sẽ lấy từ JWT
        return ResponseEntity.ok(orderService.getOrdersByDriverId(driverId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Order> completeDelivery(
            @PathVariable UUID id,
            @RequestBody DeliveryCompleteDTO dto) {
        return ResponseEntity.ok(orderService.completeDelivery(id, dto));
    }

    // --- API ĐỐI SOÁT & VERIFY (Tuần 10) ---

    @GetMapping("/{id}/report")
    public ResponseEntity<Map<String, Object>> getOrderReport(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.getOrderReport(id));
    }

}