package com.anook.backend.ailog.adapter.out.persistence;

import com.anook.backend.ailog.adapter.out.persistence.entity.AiLogJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiLogRepository extends JpaRepository<AiLogJpaEntity, Long> {
}
