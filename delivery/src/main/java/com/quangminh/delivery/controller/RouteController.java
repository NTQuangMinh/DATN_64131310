package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.RouteRequestDTO;
import com.quangminh.delivery.entity.Route;
import com.quangminh.delivery.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    @Autowired
    private RouteService routeService;

    // API Lập tuyến đường và gán cho tài xế
    @PostMapping
    public ResponseEntity<Route> createRoute(@RequestBody RouteRequestDTO dto) {
        try {
            Route createdRoute = routeService.createRoute(dto);
            return ResponseEntity.ok(createdRoute);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}