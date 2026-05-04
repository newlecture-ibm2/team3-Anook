package com.anook.backend.knowledge.application.service;

import com.anook.backend.knowledge.application.port.in.DeleteKnowledgeUseCase;
import com.anook.backend.knowledge.application.port.out.KnowledgeRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeleteKnowledgeService implements DeleteKnowledgeUseCase {

    private final KnowledgeRepositoryPort knowledgeRepositoryPort;

    @Override
    @Transactional
    public void delete(Long id) {
        knowledgeRepositoryPort.deleteById(id);
    }
}
