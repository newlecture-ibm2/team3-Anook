package com.anook.backend.knowledge.application.service;

import com.anook.backend.knowledge.application.dto.request.UpdateKnowledgeCommand;
import com.anook.backend.knowledge.application.port.in.UpdateKnowledgeUseCase;
import com.anook.backend.knowledge.application.port.out.EmbeddingPort;
import com.anook.backend.knowledge.application.port.out.KnowledgeRepositoryPort;
import com.anook.backend.knowledge.domain.model.KnowledgeEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UpdateKnowledgeService implements UpdateKnowledgeUseCase {

    private final KnowledgeRepositoryPort knowledgeRepositoryPort;
    private final EmbeddingPort embeddingPort;

    @Override
    @Transactional
    public void update(UpdateKnowledgeCommand command) {
        KnowledgeEntry entry = knowledgeRepositoryPort.findById(command.getId())
                .orElseThrow(() -> new IllegalArgumentException("Knowledge entry not found: " + command.getId()));

        entry.updateContent(command.getQuestion(), command.getAnswer());

        // 내용이 변경되었으므로 임베딩 재생성
        String contentToEmbed = "Q: " + command.getQuestion() + "\nA: " + command.getAnswer();
        float[] newEmbedding = embeddingPort.generateEmbedding(contentToEmbed);

        knowledgeRepositoryPort.update(entry, newEmbedding);
    }
}
