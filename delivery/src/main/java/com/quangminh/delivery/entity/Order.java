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

    private Double latitude; // Vĩ độ
    private Double longitude; // Kinh độ

    @Column(length = 30)
    private String status; // PENDING, ASSIGNED, DELIVERED, FAILED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_driver_id")
    private User driver;

    @Column(name = "delivery_sequence")
    private Integer deliverySequence;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}