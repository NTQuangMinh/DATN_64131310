package com.quangminh.delivery.repository;

import com.quangminh.delivery.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    // Bạn có thể thêm hàm tìm kiếm theo mã đơn hàng nếu cần
    java.util.Optional<Order> findByOrderCode(String orderCode);
}