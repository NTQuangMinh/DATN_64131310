package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.RouteRequestDTO;
import com.quangminh.delivery.entity.Route;
import com.quangminh.delivery.service.RouteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routes")
@CrossOrigin(origins = "*") // Đừng quên cái này để Web Admin React gọi không bị lỗi CORS
public class RouteController {

    @Autowired
    private RouteService routeService;

    // API Lập tuyến đường và gán cho tài xế
    @PostMapping
    public ResponseEntity<Route> createRoute(@Valid @RequestBody RouteRequestDTO dto) {
        // Mọi lỗi như "Tài xế không tồn tại" từ Service ném ra (RuntimeException),
        // hoặc lỗi thiếu dữ liệu đầu vào từ @Valid đều sẽ bị GlobalExceptionHandler tóm cổ
        // và trả về file JSON {"error": "..."} cực kỳ tường minh!
        return ResponseEntity.ok(routeService.createRoute(dto));
    }
}