package com.anook.backend.message.application.port.out;

import java.util.List;
import java.util.Map;

/**
 * AI 분석 포트 (Out) — message 모듈 소유
 *
 * 구현체:
 *   - MockAiAdapter (@Profile("dev")) — 개발용 고정 응답
 *   - PythonAiHttpAdapter (@Primary)  — AI 서버 완성 후 실제 연동
 *
 * ❌ 다른 모듈에서 이 Port를 import 금지 (각 모듈은 자체 AI Port 정의)
 */
public interface MessageAiPort {

    /**
     * 고객 메시지를 분석하여 AI 응답 + 요청 감지 결과 반환
     *
     * @param text        고객 발화 원문
     * @param roomNo      객실 번호
     * @param language    고객 언어 코드 (예: "ko", "en")
     * @param chatHistory 최근 대화 맥락
     * @return AI 분석 결과
     */
    MessageAiResult analyze(String text, String roomNo, String language, List<Map<String, String>> chatHistory);
}
