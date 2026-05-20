package com.quangminh.delivery.repository;

import com.quangminh.delivery.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    // JpaRepository đã tự động hỗ trợ hàm .save() để ghi log xuống Database
}