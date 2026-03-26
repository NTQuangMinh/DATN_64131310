package com.quangminh.delivery.controller;

import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired private UserRepository userRepository;

    @GetMapping("/drivers")
    public ResponseEntity<List<User>> getDrivers() {
        // Lọc user theo role 'DRIVER'
        List<User> drivers = userRepository.findAll().stream()
                .filter(u -> "DRIVER".equalsIgnoreCase(u.getRole()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(drivers);
    }
}