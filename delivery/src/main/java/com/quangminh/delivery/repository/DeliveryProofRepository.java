package com.quangminh.delivery.repository;

import com.quangminh.delivery.entity.DeliveryProof;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeliveryProofRepository extends JpaRepository<DeliveryProof, UUID> {
    // Tìm kiếm minh chứng ký số theo ID đơn hàng để phục vụ việc Verify
    Optional<DeliveryProof> findByOrderId(UUID orderId);
}