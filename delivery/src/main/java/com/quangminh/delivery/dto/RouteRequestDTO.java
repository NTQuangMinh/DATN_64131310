package com.quangminh.delivery.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class RouteRequestDTO {
    private UUID driverId;
    private List<UUID> orderIds;
}