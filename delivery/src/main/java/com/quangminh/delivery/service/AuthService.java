package com.quangminh.delivery.service;

import com.quangminh.delivery.dto.UserRegistrationDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.UserRepository;
import com.quangminh.delivery.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // 2. Kiểm tra mật khẩu
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }

        // 3. Tạo JWT Token
        String token = tokenProvider.generateToken(user.getUsername(), user.getRole());

        // 4. Đóng gói toàn bộ dữ liệu trả về (Thay vì để Controller phải làm)
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);

        // Ẩn mật khẩu trước khi trả về User info
        user.setPassword(null);
        response.put("user", user);

        return response;
    }

    @Transactional
    public User register(UserRegistrationDTO dto) {
        // Kiểm tra xem Username đã tồn tại chưa
        if (userRepository.findByUsername(dto.getUsername()).isPresent()) {
            throw new RuntimeException("Tên đăng nhập đã tồn tại trong hệ thống!");
        }

        // Logic chuyển đổi từ DTO sang Entity được xử lý tại Service
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setFullName(dto.getFullName());
        user.setRole(dto.getRole());

        // Mã hóa mật khẩu
        user.setPassword(passwordEncoder.encode(dto.getPassword()));

        return userRepository.save(user);
    }
}