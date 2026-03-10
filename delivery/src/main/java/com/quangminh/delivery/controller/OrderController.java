package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.DeliveryCompleteDTO;
import com.quangminh.delivery.dto.OrderRequestDTO;
import com.quangminh.delivery.entity.Order;
import com.quangminh.delivery.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    // API Tạo đơn hàng mới
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequestDTO dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }

    // API Lấy danh sách tất cả đơn hàng để hiển thị trên Dashboard Admin
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }
    @PostMapping("/complete")
    public ResponseEntity<?> complete(@RequestBody DeliveryCompleteDTO dto) {
        // Sửa lại để nhận về đối tượng đã update từ Service
        Order updatedOrder = orderService.completeDelivery(dto);
        return ResponseEntity.ok(updatedOrder);
    }
    @GetMapping("/{id}/report")
    public ResponseEntity<?> getOrderReport(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(orderService.getOrderReport(id));
    }
}