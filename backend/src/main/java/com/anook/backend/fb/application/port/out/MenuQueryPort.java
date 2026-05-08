package com.anook.backend.fb.application.port.out;

import com.anook.backend.fb.application.dto.response.MenuInfo;

import java.util.List;
import java.util.Optional;

public interface MenuQueryPort {
    List<MenuInfo> findAvailableMenus();
    Optional<MenuInfo> findById(Long menuId);
}
