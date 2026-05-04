package com.anook.backend.knowledge.application.port.in;

import com.anook.backend.knowledge.application.dto.request.UpdateKnowledgeCommand;

public interface UpdateKnowledgeUseCase {
    void update(UpdateKnowledgeCommand command);
}
