package com.quangminh.delivery.controller;

import com.quangminh.delivery.dto.ChangePasswordDTO;
import com.quangminh.delivery.dto.LocationRequestDTO;
import com.quangminh.delivery.dto.UserResponseDTO;
import com.quangminh.delivery.entity.User;
import com.quangminh.delivery.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    // GET /api/users
    @GetMapping
    public ResponseEntity<List<UserResponseDTO>> getDrivers() {
        return ResponseEntity.ok(userService.getDrivers());
    }

    // POST /api/users
    @PostMapping
    public ResponseEntity<User> createDriver(@RequestBody User user) {
        return ResponseEntity.ok(userService.createDriver(user));
    }

    // PUT /api/users/{id}
    @PutMapping("/{id}")
    public ResponseEntity<User> updateDriver(@PathVariable UUID id, @RequestBody User user) {
        return ResponseEntity.ok(userService.updateDriver(id, user));
    }

    // DELETE /api/users/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteDriver(@PathVariable UUID id) {
        userService.deleteDriver(id);
        return ResponseEntity.ok("Đã xóa tài xế thành công!");
    }
    @PostMapping("/location")
    public ResponseEntity<?> updateLocation(@RequestBody LocationRequestDTO dto) {
        // Ủy quyền hoàn toàn cho Service xử lý
        userService.updateDriverLocation(
                dto.getDriverId(),
                dto.getLatitude(),
                dto.getLongitude()
        );

        return ResponseEntity.ok("Cập nhật tọa độ thành công");
    }
    @PutMapping("/{id}/change-password")
    public ResponseEntity<?> changePassword(
            @PathVariable UUID id,
            @RequestBody ChangePasswordDTO dto) {
        try {
            userService.changePassword(id, dto.getOldPassword(), dto.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}