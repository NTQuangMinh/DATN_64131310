package com.quangminh.delivery.service;

import com.quangminh.delivery.dto.UserResponseDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public List<UserResponseDTO> getDrivers() {
        // Tối ưu hóa: Trực tiếp nhờ Database lọc ra DRIVER, cực kỳ nhẹ và nhanh!
        List<User> drivers = userRepository.findByRole("DRIVER");

        // Chuyển đổi từ Entity sang DTO để giấu đi cột Password và các thông tin nhạy cảm khác
        return drivers.stream().map(user -> {
            UserResponseDTO dto = new UserResponseDTO();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullName());
            dto.setPhone(user.getPhone());
            dto.setEmail(user.getEmail());
            dto.setRole(user.getRole());
            dto.setLatitude(user.getLatitude());
            dto.setLongitude(user.getLongitude());
            return dto;
        }).collect(Collectors.toList());
    }
    @Transactional
    public User createDriver(User dto) {
        User driver = new User();
        driver.setUsername(dto.getUsername()); // 🌟 Lấy chuẩn Username từ Frontend
        driver.setFullName(dto.getFullName());
        driver.setPhone(dto.getPhone());
        driver.setEmail(dto.getEmail());

        // Mã hóa mật khẩu mặc định trước khi lưu
        driver.setPassword(passwordEncoder.encode("123456"));
        driver.setRole("DRIVER");
        return userRepository.save(driver);
    }

    // CẬP NHẬT TÀI XẾ
    @Transactional
    public User updateDriver(UUID id, User dto) {
        User driver = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài xế!"));

        driver.setUsername(dto.getUsername()); // 🌟 Cập nhật Username
        driver.setFullName(dto.getFullName());
        driver.setPhone(dto.getPhone());
        driver.setEmail(dto.getEmail());

        return userRepository.save(driver);
    }
    @Transactional
    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản"));

        // Kiểm tra xem mật khẩu cũ có đúng với Database không
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác!");
        }

        // Nếu đúng, mã hóa mật khẩu mới và lưu lại
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    @Transactional
    public void deleteDriver(UUID id) {
        // Khuyến nghị: Thực tế nên dùng "Soft Delete" (đổi status) thay vì xóa cứng
        // Nhưng nếu DB bạn chưa có status, có thể dùng deleteById
        userRepository.deleteById(id);
    }
    @Transactional
    public void updateDriverLocation(UUID driverId, Double latitude, Double longitude) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Tài xế không tồn tại trong hệ thống"));

        driver.setLatitude(latitude);
        driver.setLongitude(longitude);

        userRepository.save(driver);
    }
}