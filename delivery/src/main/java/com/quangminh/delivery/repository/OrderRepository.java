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
    Optional<Order> findByOrderCode(String orderCode);

    // 2. Lấy danh sách nhiệm vụ cho tài xế dựa trên ID và trạng thái
    // Thường dùng trạng thái 'ASSIGNED' để tài xế biết mình cần giao đơn nào
    List<Order> findByDriverIdAndStatus(UUID driverId, String status);

    // 3. Lấy tất cả đơn hàng thuộc về một tuyến đường cụ thể (Tuần 5)
    List<Order> findByRouteId(UUID routeId);

    // 4. Tìm các đơn hàng đã hoàn thành để phục vụ đối soát và Verify (Tuần 10)
    List<Order> findByStatus(String status);
}