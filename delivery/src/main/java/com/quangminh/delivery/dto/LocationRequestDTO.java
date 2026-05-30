package com.quangminh.delivery.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class LocationRequestDTO {
    private UUID driverId;
    private Double latitude;
    private Double longitude;
}