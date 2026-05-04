package com.anook.backend.admin.message.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 관리자용 메시지 JPA Entity (읽기 전용)
 *
 * message 테이블에 매핑하되, admin/message 모듈에서 독립적으로 관리.
 * 다른 모듈(message)의 JPA Entity를 import하지 않음.
 */
@Entity(name = "AdminMessage")
@Table(name = "message")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdminMessageJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_type", nullable = false, length = 10)
    private String senderType;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "translated_content", columnDefinition = "TEXT")
    private String translatedContent;

    @Column(name = "room_no", nullable = false, length = 10)
    private String roomNo;

    @Column(name = "request_id")
    private Long requestId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
