package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.UserResponseDTO;
import com.quangminh.delivery.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*") // Cho phép React gọi API
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/drivers")
    public ResponseEntity<List<UserResponseDTO>> getDrivers() {
        // Controller hoàn toàn sạch bóng logic
        return ResponseEntity.ok(userService.getDrivers());
    }
}