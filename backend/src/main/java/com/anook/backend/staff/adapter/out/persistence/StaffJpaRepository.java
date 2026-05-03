package com.anook.backend.staff.adapter.out.persistence;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StaffJpaRepository extends JpaRepository<StaffJpaEntity, Long> {

    @EntityGraph(attributePaths = "department")
    Optional<StaffJpaEntity> findByPin(String pin);

    @EntityGraph(attributePaths = "department")
    Optional<StaffJpaEntity> findById(Long id);
}
