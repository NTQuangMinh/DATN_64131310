package com.quangminh.delivery.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class RouteRequestDTO {

    @NotNull(message = "ID Tài xế không được để trống")
    private UUID driverId;

    @NotEmpty(message = "Danh sách đơn hàng cần lập tuyến không được để trống")
    private List<UUID> orderIds;
}