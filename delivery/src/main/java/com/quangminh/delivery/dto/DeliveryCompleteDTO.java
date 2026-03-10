package com.quangminh.delivery.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class DeliveryCompleteDTO {
    private UUID orderId;
    private String status; // SUCCESS hoặc FAILED
    private String failureReason; // Lý do nếu giao thất bại
    private String signatureValue; // Chữ ký số gửi từ Mobile
    private Double currentLat; // Vĩ độ thực tế khi nhấn hoàn tất
    private Double currentLng; // Kinh độ thực tế khi nhấn hoàn tất
}