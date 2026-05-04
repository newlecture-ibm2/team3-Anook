package com.anook.backend.knowledge.application.port.out;

public interface EmbeddingPort {
    float[] generateEmbedding(String text);
}
