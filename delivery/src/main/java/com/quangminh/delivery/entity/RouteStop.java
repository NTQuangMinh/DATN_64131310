package com.quangminh.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "route_stops")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class RouteStop {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "route_id")
    private Route route;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order; // Đơn hàng tương ứng tại điểm dừng này

    @Column(name = "stop_order")
    private Integer stopOrder; // Thứ tự giao hàng (1, 2, 3...)
}