package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(length = 20)
    private String role; // Sẽ chứa 'ADMIN' hoặc 'DRIVER'

    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey; // Dùng cho việc Verify chữ ký số sau này

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}