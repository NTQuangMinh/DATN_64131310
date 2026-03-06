package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.LoginRequest;
import com.quangminh.delivery.dto.UserRegistrationDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRegistrationDTO dto) {
        // Chuyển đổi từ DTO sang Entity để lưu vào DB
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(dto.getPassword());
        user.setFullName(dto.getFullName());
        user.setRole(dto.getRole());

        return ResponseEntity.ok(authService.register(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Swagger sẽ tự động đọc các thuộc tính của LoginRequest để hiển thị
        return ResponseEntity.ok(authService.login(request.getUsername(), request.getPassword()));
    }
}