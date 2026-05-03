package com.anook.backend.staff.application.port.out;

import com.anook.backend.staff.domain.model.Staff;

import java.util.Optional;

public interface StaffRepositoryPort {
    Optional<Staff> findByPin(String pin);
    
    Optional<Staff> findById(Long id);
    
    /**
     * 직원 정보 저장 (JTI 업데이트 등)
     */
    void save(Staff staff);
}
