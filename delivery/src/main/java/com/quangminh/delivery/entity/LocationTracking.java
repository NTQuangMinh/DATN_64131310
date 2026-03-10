package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "location_tracking")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class LocationTracking {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private User driver;

    private Double latitude;
    private Double longitude;
    private Double speed;
    private Double heading;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
}