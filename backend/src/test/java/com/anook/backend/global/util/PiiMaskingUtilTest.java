package com.anook.backend.global.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PiiMaskingUtilTest {

    @Test
    @DisplayName("휴대폰 번호가 정상적으로 마스킹되어야 한다")
    void maskPhoneNumber() {
        String input1 = "제 번호는 010-1234-5678 입니다.";
        String input2 = "연락처: 01012345678";
        String input3 = "011-123-4567로 전화주세요.";

        assertThat(PiiMaskingUtil.maskPii(input1)).isEqualTo("제 번호는 010-****-**** 입니다.");
        assertThat(PiiMaskingUtil.maskPii(input2)).isEqualTo("연락처: 010-****-****");
        assertThat(PiiMaskingUtil.maskPii(input3)).isEqualTo("011-****-****로 전화주세요.");
    }

    @Test
    @DisplayName("주민등록번호가 정상적으로 마스킹되어야 한다")
    void maskRrn() {
        String input1 = "제 주민번호는 900101-1234567 입니다.";
        String input2 = "9001011234567";

        assertThat(PiiMaskingUtil.maskPii(input1)).isEqualTo("제 주민번호는 900101-******* 입니다.");
        assertThat(PiiMaskingUtil.maskPii(input2)).isEqualTo("900101-*******");
    }

    @Test
    @DisplayName("신용카드 번호가 정상적으로 마스킹되어야 한다")
    void maskCardNumber() {
        String input1 = "카드번호 1234-5678-1234-5678 입니다.";
        String input2 = "1234 5678 1234 5678 결제해 주세요.";

        assertThat(PiiMaskingUtil.maskPii(input1)).isEqualTo("카드번호 1234-****-****-5678 입니다.");
        assertThat(PiiMaskingUtil.maskPii(input2)).isEqualTo("1234-****-****-5678 결제해 주세요.");
    }

    @Test
    @DisplayName("이메일 주소가 정상적으로 마스킹되어야 한다")
    void maskEmail() {
        String input1 = "제 이메일은 test1234@gmail.com 입니다.";
        String input2 = "a@naver.com";

        assertThat(PiiMaskingUtil.maskPii(input1)).isEqualTo("제 이메일은 t*******@gmail.com 입니다.");
        assertThat(PiiMaskingUtil.maskPii(input2)).isEqualTo("*@naver.com"); // 길이가 짧은 경우 처리 방식
    }

    @Test
    @DisplayName("입력값이 null이거나 빈 문자열일 경우 원본을 그대로 반환해야 한다")
    void maskNullOrEmpty() {
        assertThat(PiiMaskingUtil.maskPii(null)).isNull();
        assertThat(PiiMaskingUtil.maskPii("")).isEmpty();
        assertThat(PiiMaskingUtil.maskPii("   ")).isEqualTo("   ");
    }

    @Test
    @DisplayName("마스킹 대상이 없는 일반 텍스트는 그대로 반환해야 한다")
    void noMaskingNeeded() {
        String input = "안녕하세요. 수건 좀 더 주실 수 있나요?";
        assertThat(PiiMaskingUtil.maskPii(input)).isEqualTo("안녕하세요. 수건 좀 더 주실 수 있나요?");
    }
}
