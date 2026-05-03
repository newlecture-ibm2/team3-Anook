package com.anook.backend.staff.adapter.out.persistence;

import com.anook.backend.staff.domain.model.Staff;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "staff")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StaffJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String pin;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private DepartmentJpaEntity department;

    @Column(length = 100)
    private String jti; // JWT 식별자

    public Staff toDomain() {
        return Staff.builder()
                .id(id)
                .name(name)
                .pin(pin)
                .roleId(roleId)
                .department(department.toDomain())
                .jti(jti)
                .build();
    }

    /**
     * JTI 업데이트 (중복 로그인 방지용)
     */
    public void updateJti(String jti) {
        this.jti = jti;
    }

    public static StaffJpaEntity fromDomain(Staff staff) {
        StaffJpaEntity entity = new StaffJpaEntity();
        entity.id = staff.getId();
        entity.name = staff.getName();
        entity.pin = staff.getPin();
        entity.roleId = staff.getRoleId();
        // 부서는 ID만 있으면 되지만 JPA Entity이므로 주의 필요. 
        // 여기선 단순 업데이트용이므로 ID만 채우거나 JpaRepository.save를 위해 필드를 채움.
        entity.jti = staff.getJti();
        return entity;
    }
}
