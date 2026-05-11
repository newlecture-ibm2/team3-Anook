package com.anook.backend.message.application.util;

import java.util.regex.Pattern;

public class PiiMaskingUtil {

    // 개인정보 패턴 정규식 정의
    private static final Pattern PHONE_PATTERN = Pattern.compile("(01[016789])[-.\\s]?(\\d{3,4})[-.\\s]?(\\d{4})");
    private static final Pattern RRN_PATTERN = Pattern.compile("(\\d{6})[-.\\s]?([1-4]\\d{6})"); // 주민등록번호
    private static final Pattern CARD_PATTERN = Pattern.compile("(\\d{4})[-.\\s]?(\\d{4})[-.\\s]?(\\d{4})[-.\\s]?(\\d{4})");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})");

    private PiiMaskingUtil() {
        // 인스턴스화 방지
    }

    /**
     * 입력된 텍스트 내의 개인식별정보(PII)를 마스킹 처리합니다.
     * AI 모델로 텍스트를 전송하기 전에 이 메서드를 호출하여 개인정보 유출을 방지해야 합니다.
     * 
     * @param input 원본 텍스트
     * @return 마스킹 처리된 텍스트
     */
    public static String maskPii(String input) {
        if (input == null || input.isBlank()) {
            return input;
        }

        String masked = input;
        
        // 1. 카드 번호 마스킹 (예: 1234-5678-1234-5678 -> 1234-****-****-5678)
        masked = CARD_PATTERN.matcher(masked).replaceAll("$1-****-****-$4");

        // 2. 주민등록번호 마스킹 (예: 900101-1234567 -> 900101-*******)
        masked = RRN_PATTERN.matcher(masked).replaceAll("$1-*******");
        
        // 3. 휴대폰 번호 마스킹 (예: 010-1234-5678 -> 010-****-****)
        // (주민번호 13자리 안에 010으로 시작하는 11자리 패턴이 포함될 수 있으므로 순서 중요)
        masked = PHONE_PATTERN.matcher(masked).replaceAll("$1-****-****");

        // 4. 이메일 마스킹 (예: test1234@gmail.com -> t*******@gmail.com)
        masked = EMAIL_PATTERN.matcher(masked).replaceAll(matchResult -> {
            String localPart = matchResult.group(1);
            String domain = matchResult.group(2);
            String tld = matchResult.group(3);
            
            String maskedLocal = localPart.length() > 1 
                ? localPart.charAt(0) + "*".repeat(localPart.length() - 1) 
                : "*";
                
            return maskedLocal + "@" + domain + "." + tld;
        });

        return masked;
    }
}
