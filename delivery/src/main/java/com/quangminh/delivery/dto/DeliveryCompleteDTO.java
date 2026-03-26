package com.quangminh.delivery.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class DeliveryCompleteDTO {
    private UUID orderId;
    private String status;
    private String failureReason;
    private String signatureValue;

    // Đảm bảo tên trường như sau:
    private Double actualLatitude;
    private Double actualLongitude;
    private String evidenceImage;
}