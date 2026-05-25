package com.quangminh.delivery.service;

import com.quangminh.delivery.dto.UserResponseDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<UserResponseDTO> getDrivers() {
        // Tối ưu hóa: Trực tiếp nhờ Database lọc ra DRIVER, cực kỳ nhẹ và nhanh!
        List<User> drivers = userRepository.findByRole("DRIVER");

        // Chuyển đổi từ Entity sang DTO để giấu đi cột Password và các thông tin nhạy cảm khác
        return drivers.stream().map(user -> {
            UserResponseDTO dto = new UserResponseDTO();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullName());
            dto.setRole(user.getRole());
            return dto;
        }).collect(Collectors.toList());
    }
}