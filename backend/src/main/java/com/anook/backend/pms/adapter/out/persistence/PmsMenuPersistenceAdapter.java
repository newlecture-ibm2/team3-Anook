package com.anook.backend.pms.adapter.out.persistence;

import com.anook.backend.pms.application.port.out.PmsMenuRepositoryPort;
import com.anook.backend.pms.domain.model.PmsMenu;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * PMS 메뉴 Persistence Adapter
 *
 * pms_menu 테이블 조회 (JdbcTemplate 사용).
 */
@Component
@RequiredArgsConstructor
public class PmsMenuPersistenceAdapter implements PmsMenuRepositoryPort {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<PmsMenu> MENU_ROW_MAPPER = (rs, rowNum) -> new PmsMenu(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getInt("price"),
            rs.getString("category"),
            rs.getString("allergens"),
            rs.getString("options"),
            rs.getBoolean("available")
    );

    @Override
    public List<PmsMenu> findAllAvailable() {
        return jdbcTemplate.query(
                "SELECT id, name, price, category, allergens, options, available FROM pms_menu WHERE available = TRUE ORDER BY category, name",
                MENU_ROW_MAPPER
        );
    }

    @Override
    public List<PmsMenu> findAll() {
        return jdbcTemplate.query(
                "SELECT id, name, price, category, allergens, options, available FROM pms_menu ORDER BY category, name",
                MENU_ROW_MAPPER
        );
    }

    @Override
    public Optional<PmsMenu> findById(Long id) {
        List<PmsMenu> results = jdbcTemplate.query(
                "SELECT id, name, price, category, allergens, options, available FROM pms_menu WHERE id = ?",
                MENU_ROW_MAPPER,
                id
        );
        return results.stream().findFirst();
    }
}
