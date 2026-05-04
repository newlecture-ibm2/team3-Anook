package com.anook.backend.knowledge.application.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateKnowledgeCommand {
    private String question;
    private String answer;
    private String domainCode;
}
