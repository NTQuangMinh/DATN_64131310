package com.quangminh.delivery.service;

import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.UserRepository;
import com.quangminh.delivery.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    public Map<String, Object> login(String username, String password) {
        // 1. Tìm người dùng trong DB
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // 2. Kiểm tra mật khẩu (so sánh pass thô với pass đã mã hóa trong DB)
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }

        // 3. Tạo JWT Token
        String token = tokenProvider.generateToken(user.getUsername(), user.getRole());

        // 4. Trả về dữ liệu (Sử dụng .put thay vì .add)
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("role", user.getRole());
        response.put("fullName", user.getFullName());

        return response;
    }

    // Hàm đăng ký để bạn tạo tài khoản test trực tiếp từ Swagger
    public User register(User user) {
        // Mã hóa mật khẩu trước khi lưu vào DB
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Mặc định tạo mới chưa có Public Key (sẽ cập nhật khi tài xế ký số)
        return userRepository.save(user);
    }
}