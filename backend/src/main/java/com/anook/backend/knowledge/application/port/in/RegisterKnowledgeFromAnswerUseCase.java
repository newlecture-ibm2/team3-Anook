package com.anook.backend.knowledge.application.port.in;

import com.anook.backend.knowledge.application.dto.request.RegisterKnowledgeFromAnswerCommand;
import com.anook.backend.knowledge.application.dto.response.CreateKnowledgeResult;

/**
 * 직원 답변 기반 RAG 지식 등록 UseCase (Port In)
 *
 * 직원(프론트데스크)이 고객의 미답변 질문에 답변한 후,
 * "RAG 데이터로 등록하시겠어요?" 모달에서 확인을 누르면 호출된다.
 *
 * Q&A를 knowledge_entry 테이블에 임베딩과 함께 자동 삽입하여
 * 다음 번 동일 질문에 AI가 자동 응답할 수 있게 한다. (플라이휠)
 *
 * ❌ 다른 모듈에서 이 UseCase를 직접 호출하지 않는다 — Controller(Adapter In)만 의존
 */
public interface RegisterKnowledgeFromAnswerUseCase {

    /**
     * 직원 답변을 RAG 지식으로 등록
     *
     * @param command 고객 질문, 직원 답변, 부서 코드, 객실 번호
     * @return 생성된 knowledge_entry ID
     */
    CreateKnowledgeResult register(RegisterKnowledgeFromAnswerCommand command);
}
