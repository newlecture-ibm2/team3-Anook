package com.anook.backend.global.util;

import com.anook.backend.guest.domain.event.GuestCheckedOutEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisImageCacheUtil {

    private final StringRedisTemplate redisTemplate;
    private static final String KEY_PREFIX = "task:image:";

    /**
     * 이미지 Base64 데이터를 Redis에 임시 저장합니다.
     */
    public void saveImage(String roomNo, Long taskId, String base64Image, Duration ttl) {
        String key = KEY_PREFIX + roomNo + ":" + taskId;
        redisTemplate.opsForValue().set(key, base64Image, ttl);
        log.info("[Redis] {}호 Task {} 이미지 캐싱 완료 (TTL: {}s)", roomNo, taskId, ttl.getSeconds());
    }

    /**
     * Redis에서 이미지 데이터를 조회합니다.
     */
    public String getImage(String roomNo, Long taskId) {
        String key = KEY_PREFIX + roomNo + ":" + taskId;
        return redisTemplate.opsForValue().get(key);
    }

    /**
     * 특정 호실(roomNo)의 모든 이미지 캐시를 강제 파기(Hard Delete)합니다.
     * PMS 체크아웃 이벤트 발생 시 자동 호출됩니다.
     */
    @EventListener
    public void onGuestCheckedOut(GuestCheckedOutEvent event) {
        String roomNo = event.roomNumber();
        String pattern = KEY_PREFIX + roomNo + ":*";
        Set<String> keys = redisTemplate.keys(pattern);

        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.info("[Redis] {}호 체크아웃 이벤트 수신 -> {}개의 이미지 캐시 영구 삭제 완료", roomNo, keys.size());
        } else {
            log.info("[Redis] {}호 체크아웃 이벤트 수신 -> 삭제할 이미지 캐시 없음", roomNo);
        }
    }
}
