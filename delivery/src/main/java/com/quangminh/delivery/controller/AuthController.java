package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.LoginRequest;
import com.quangminh.delivery.dto.UserRegistrationDTO;
import com.quangminh.delivery.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*") // Nhớ thêm CORS để Frontend không bị chặn
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRegistrationDTO dto) {
        // Controller chỉ truyền DTO xuống, nhận Entity đã lưu về và trả ra HTTP 200
        return ResponseEntity.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        // AuthService giờ đã trả về đúng cấu trúc Map bao gồm cả Token và User Info
        return ResponseEntity.ok(authService.login(request.getUsername(), request.getPassword()));
    }
}