package com.quangminh.delivery.repository;

import com.quangminh.delivery.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    // 1. Tìm đơn hàng theo mã code (Ví dụ: ORD-001)
    Order findByOrderCode(String orderCode);

    // 2. Lấy danh sách nhiệm vụ cho tài xế dựa trên ID và trạng thái
    // Thường dùng trạng thái 'ASSIGNED' để tài xế biết mình cần giao đơn nào
    // Sửa hàm cũ từ tìm 1 trạng thái thành tìm danh sách trạng thái thuộc ASSIGNED hoặc DELIVERING
    List<Order> findByDriverIdAndStatusIn(UUID driverId, List<String> statuses);

    List<Order> findByRouteId(UUID routeId);


    List<Order> findByStatus(String status);

    long countByStatus(String status);
}