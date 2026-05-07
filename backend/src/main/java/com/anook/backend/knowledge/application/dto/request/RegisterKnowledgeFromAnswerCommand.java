package com.anook.backend.knowledge.application.dto.request;

/**
 * 직원이 채팅에서 답변 후 RAG 등록 시 사용하는 Command
 *
 * 흐름: 고객 미답변 질문 → 직원 답변 → "RAG 등록" 모달 확인 → 이 Command 생성
 *
 * @param question   고객의 원본 질문 (message 테이블에서 가져옴)
 * @param answer     직원이 입력한 답변 내용
 * @param domainCode 부서 코드 (nullable → null이면 "COMMON"으로 기본 설정)
 * @param roomNo     어떤 객실의 대화에서 발생한 건지 (로깅/감사용)
 * @param status     등록 상태 (nullable → null이면 "APPROVED", "PENDING"이면 나중에 검토)
 */
public record RegisterKnowledgeFromAnswerCommand(
        String question,
        String answer,
        String domainCode,
        String roomNo,
        String status
) {
}
