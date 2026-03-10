package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "routes")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "driver_id")
    private User driver; // Tài xế phụ trách tuyến này

    @Column(name = "route_date")
    private LocalDate routeDate;

    @Column(name = "route_status", length = 30)
    private String routeStatus; // PENDING, IN_PROGRESS, COMPLETED

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}