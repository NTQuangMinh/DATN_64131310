package com.quangminh.delivery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class DeliveryCompleteDTO {

    @NotNull(message = "ID Đơn hàng không được để trống")
    private UUID orderId;

    @NotBlank(message = "Trạng thái giao hàng không được để trống")
    private String status;

    private String failureReason;
    private String signatureValue;

    @NotNull(message = "Tọa độ thực tế (Vĩ độ) không được để trống")
    private Double actualLatitude;

    @NotNull(message = "Tọa độ thực tế (Kinh độ) không được để trống")
    private Double actualLongitude;

    private String evidenceImage;
}