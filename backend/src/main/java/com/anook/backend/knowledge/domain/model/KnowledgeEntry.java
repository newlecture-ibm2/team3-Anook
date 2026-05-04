package com.anook.backend.knowledge.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class KnowledgeEntry {
    private final Long id;
    private String question;
    private String answer;
    private final DomainCode domainCode;
    private KnowledgeStatus status;
    private final Long approvedBy;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public void updateContent(String question, String answer) {
        this.question = question;
        this.answer = answer;
        this.updatedAt = LocalDateTime.now();
    }
}
