package com.anook.backend.knowledge.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class GetKnowledgeDetailResult {
    private Long id;
    private String question;
    private String answer;
    private String domainCode;
    private String status;
    private Long approvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
