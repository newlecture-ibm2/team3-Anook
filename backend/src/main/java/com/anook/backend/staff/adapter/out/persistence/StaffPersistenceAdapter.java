package com.anook.backend.staff.adapter.out.persistence;

import com.anook.backend.staff.application.port.out.StaffRepositoryPort;
import com.anook.backend.staff.domain.model.Staff;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class StaffPersistenceAdapter implements StaffRepositoryPort {

    private final StaffJpaRepository staffJpaRepository;

    public StaffPersistenceAdapter(StaffJpaRepository staffJpaRepository) {
        this.staffJpaRepository = staffJpaRepository;
    }

    @Override
    public Optional<Staff> findByPin(String pin) {
        return staffJpaRepository.findByPin(pin)
                .map(StaffJpaEntity::toDomain);
    }

    @Override
    public Optional<Staff> findById(Long id) {
        return staffJpaRepository.findById(id)
                .map(StaffJpaEntity::toDomain);
    }

    @Override
    public void save(Staff staff) {
        // 더티 체킹을 사용하여 JTI만 업데이트합니다.
        staffJpaRepository.findById(staff.getId()).ifPresent(entity -> {
            entity.updateJti(staff.getJti());
            staffJpaRepository.save(entity);
        });
    }
}
