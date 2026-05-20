package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Các hành động: CREATE_ROUTE, CHECK_IN, CHECK_OUT, CREATE_RECEIPT, VERIFY
    @Column(nullable = false)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private String performedBy; // Lưu mã tài xế hoặc "ADMIN"

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(columnDefinition = "TEXT")
    private String detail; // Ghi chi tiết dữ liệu (Ví dụ: "Tài xế check-in tại tọa độ 16.04, 108.20")

    // Constructors
    public AuditLog() {}

    public AuditLog(String action, String performedBy, String detail) {
        this.action = action;
        this.performedBy = performedBy;
        this.detail = detail;
        this.timestamp = LocalDateTime.now();
    }

    // Getters và Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
}