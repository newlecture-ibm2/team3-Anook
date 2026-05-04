package com.anook.backend.knowledge.application.port.in;

import com.anook.backend.knowledge.application.dto.response.GetKnowledgeDetailResult;

public interface GetKnowledgeDetailUseCase {
    GetKnowledgeDetailResult getById(Long id);
}
