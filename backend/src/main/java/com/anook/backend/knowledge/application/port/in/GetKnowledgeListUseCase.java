package com.anook.backend.knowledge.application.port.in;

import com.anook.backend.knowledge.application.dto.response.GetKnowledgeResult;
import java.util.List;

public interface GetKnowledgeListUseCase {
    List<GetKnowledgeResult> getByDomain(String domainCode);
    List<GetKnowledgeResult> getAll();
}
