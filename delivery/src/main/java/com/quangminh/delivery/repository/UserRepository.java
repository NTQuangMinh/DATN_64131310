package com.quangminh.delivery.repository;

import com.quangminh.delivery.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    // Tìm kiếm người dùng bằng username để phục vụ đăng nhập
    Optional<User> findByUsername(String username);
    List<User> findByRole(String role);
}