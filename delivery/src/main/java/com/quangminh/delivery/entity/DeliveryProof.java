package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "delivery_proofs")
@Getter @Setter
public class DeliveryProof {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "pdf_path")
    private String pdfPath; // Đường dẫn file biên bản PDF tự động sinh

    @Column(name = "hash_value")
    private String hashValue; // SHA-256 hash của nội dung biên bản

    @Column(name = "signature_value", columnDefinition = "TEXT")
    private String signatureValue; // Chữ ký số bằng khóa riêng của tài xế

    @Column(name = "signed_at")
    private LocalDateTime signedAt = LocalDateTime.now();
}