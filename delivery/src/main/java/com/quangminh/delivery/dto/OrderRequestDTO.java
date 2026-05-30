package com.quangminh.delivery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OrderRequestDTO {
    // Không cần validate orderCode vì hệ thống sẽ tự sinh

    @NotBlank(message = "Tên khách hàng không được để trống")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(0|\\+84)\\d{9,10}$", message = "Số điện thoại không hợp lệ (Phải từ 10-11 số)")
    private String customerPhone;

    @NotBlank(message = "Địa chỉ giao hàng không được để trống")
    private String deliveryAddress;

    @NotNull(message = "Vĩ độ (Latitude) không được để trống")
    private Double latitude;

    @NotNull(message = "Kinh độ (Longitude) không được để trống")
    private Double longitude;
    private String driverName;
    private LocalDateTime checkinTime;
    private LocalDateTime updatedAt;
}