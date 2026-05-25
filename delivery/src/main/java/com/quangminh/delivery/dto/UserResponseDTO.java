package com.quangminh.delivery.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserResponseDTO {
    private UUID id;
    private String username;
    private String fullName;
    private String role;
}