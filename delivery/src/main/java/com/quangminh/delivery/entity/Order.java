package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder // Thêm Builder để thuận tiện tạo object trong Unit Test
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "order_code", length = 50, unique = true)
    private String orderCode;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    // --- Tọa độ Admin thiết lập (Kế hoạch) ---
    private Double latitude;
    private Double longitude;

    // --- Thông tin thực tế tài xế Check-in (Đối soát) ---
    @Column(name = "actual_latitude")
    private Double actualLatitude;

    @Column(name = "actual_longitude")
    private Double actualLongitude;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "evidence_image", columnDefinition = "TEXT")
    private String evidenceImage; // Lưu link ảnh hoặc Base64 ảnh minh chứng

    // --- Dữ liệu phục vụ Ký số (Digital Signature) ---
    @Column(name = "hash_value", columnDefinition = "TEXT")
    private String hashValue; // Mã SHA-256 của biên bản

    @Column(name = "signature_value", columnDefinition = "TEXT")
    private String signatureValue; // Chữ ký số sau khi ký bằng Private Key

    // --- Quản lý trạng thái & Phân quyền ---
    @Column(length = 30)
    private String status; // PENDING, ASSIGNED, DELIVERED, FAILED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_driver_id")
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route;

    @Column(name = "delivery_sequence")
    private Integer deliverySequence;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}