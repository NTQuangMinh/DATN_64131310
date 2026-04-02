package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.LoginRequest;
import com.quangminh.delivery.dto.UserRegistrationDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.service.AuthService;
import com.quangminh.delivery.repository.UserRepository; // Import thêm
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository; // Inject để lấy thông tin user

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserRegistrationDTO dto) {
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(dto.getPassword());
        user.setFullName(dto.getFullName());
        user.setRole(dto.getRole());
        return ResponseEntity.ok(authService.register(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // 1. Gọi authService để lấy token (giữ nguyên logic cũ của bạn bên trong service)
        Object authResponse = authService.login(request.getUsername(), request.getPassword());

        // Giả sử authService.login trả về một object/map có chứa chuỗi "token"
        // 2. Tìm thông tin user để gửi kèm về cho Frontend
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 3. Tạo response tổng hợp
        Map<String, Object> finalResponse = new HashMap<>();

        // Nếu authResponse của bạn là String (chỉ token) thì để jwt = authResponse
        // Nếu là Object thì lấy token từ field của nó
        finalResponse.put("token", authResponse instanceof Map ? ((Map) authResponse).get("token") : authResponse);

        // Gửi thông tin user (ẩn mật khẩu đi)
        user.setPassword(null);
        finalResponse.put("user", user);

        return ResponseEntity.ok(finalResponse);
    }
}