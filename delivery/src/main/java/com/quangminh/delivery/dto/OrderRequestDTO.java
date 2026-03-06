package com.quangminh.delivery.dto;

import lombok.Data;

@Data
public class OrderRequestDTO {
    private String orderCode;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
}