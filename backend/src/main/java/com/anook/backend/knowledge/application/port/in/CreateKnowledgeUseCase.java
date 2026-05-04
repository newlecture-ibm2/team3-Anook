package com.anook.backend.knowledge.application.port.in;

import com.anook.backend.knowledge.application.dto.request.CreateKnowledgeCommand;
import com.anook.backend.knowledge.application.dto.response.CreateKnowledgeResult;

public interface CreateKnowledgeUseCase {
    CreateKnowledgeResult create(CreateKnowledgeCommand command);
}
