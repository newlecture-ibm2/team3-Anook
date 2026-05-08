"""
긴급 상황 키워드 Pre-Filter (EM-217)
────────────────────────────────────
Gemini 호출 이전에 화재·의료·위협 키워드를 감지하여
즉시 EMERGENCY + URGENT로 반환한다.

매칭 시 Gemini 호출을 건너뛰어 지연 시간을 0에 가깝게 줄인다.
"""

from typing import Optional, Dict, Any

EMERGENCY_KEYWORDS: Dict[str, Dict[str, Any]] = {
    "MEDICAL_ASSIST": {
        "keywords": [
            # 한국어
            "피 나", "피가 나", "베었", "다쳤", "해열제", "구급 상자", "반창고", "배 아파", "배가 아파", "복통", "고열", "응급실",
            # English
            "bleeding", "cut my", "injured", "fever", "medicine", "first aid", "band aid", "stomachache", "stomach ache",
        ],
        "severity": 8,
    },
    "SECURITY": {
        "keywords": [
            # 한국어
            "싸우는", "싸워요", "싸움", "다툼", "폭력", "비명", "무서워", "누가 자꾸", "모르는 사람", "문 손잡이", "문 쾅쾅", "취객", "술 취한", "술취한",
            # English
            "fighting", "screaming", "scared", "someone knocking", "stranger", "trying to open",
        ],
        "severity": 9,
    },
    "WATER_LEAK": {
        "keywords": [
            # 한국어
            "천장에서 물", "방이 물바다", "변기 터졌", "홍수", "침수",
            # English
            "flooded", "flooding", "water pouring", "pipe burst", "overflowing",
        ],
        "severity": 10,
    },
    "URGENT_CLEANUP": {
        "keywords": [
            # 한국어
            "토해", "토했", "구토", "토사물", "오물", "똥", "더러워", "악취", "역겨운",
            # English
            "vomit", "puke", "throw up", "feces", "poop", "biohazard", "disgusting smell",
        ],
        "severity": 8,
    }
}
# 긴급 상황별 다국어 응답 (한국어/영어만 지원)
EMERGENCY_REPLIES: Dict[str, Dict[str, str]] = {
    "MEDICAL_ASSIST": {
        "ko": "구급약품/의료 지원이 필요하시군요. 직원이 구급상자를 지참하여 즉시 객실로 출동하겠습니다. 안정을 취하고 잠시만 기다려주세요.",
        "en": "We received your medical assistance request. A staff member is bringing a first-aid kit to your room immediately. Please rest and wait.",
    },
    "SECURITY": {
        "ko": "고객님, 놀라게 해드려 죄송합니다. 즉시 보안팀과 직원이 해당 층으로 출동하여 안전을 확보하겠습니다. 안심하시고 객실 문을 잠근 채 대기해 주세요.",
        "en": "We apologize for the disturbance. Security and staff are on their way to your floor immediately to ensure your safety. Please lock your door and wait safely.",
    },
    "WATER_LEAK": {
        "ko": "🚨 객실 누수가 감지되었습니다! 감전 위험이 있으니 콘센트에서 떨어져 계세요. 시설팀이 즉시 출동하여 룸 체인지를 도와드리겠습니다.",
        "en": "🚨 Room flooding detected! Please stay away from electrical outlets. Our facility team is on the way to assist with a room change.",
    },
    "URGENT_CLEANUP": {
        "ko": "불쾌감을 드려 대단히 죄송합니다. 하우스키핑팀이 즉시 출동하여 해당 구역을 신속하고 깨끗하게 청소 및 소독 조치하겠습니다.",
        "en": "We sincerely apologize for the unpleasant experience. Housekeeping is on the way to immediately clean and sanitize the area.",
    }
}

import re

def emergency_pre_filter(text: str) -> Optional[Dict[str, Any]]:
    """
    키워드 기반 긴급 상황 사전 필터.
    한국어 조사나 띄어쓰기 변형에도 유연하게 대처하기 위해 정규식(Regex) 매칭 적용.
    """
    text_lower = text.lower()
    text_no_space = text_lower.replace(" ", "")

    for category, config in EMERGENCY_KEYWORDS.items():
        for keyword in config["keywords"]:
            keyword_lower = keyword.lower()
            keyword_no_space = keyword_lower.replace(" ", "")
            
            # 1. 띄어쓰기 완전 무시 매칭 ("피가나" -> "피가 나요" 등 매칭)
            if keyword_no_space in text_no_space:
                return {
                    "category": category,
                    "matched_keyword": keyword,
                    "severity": config["severity"],
                }
                
            # 2. 키워드에 공백이 포함된 경우, 유연한 정규식 매칭
            # 예: "물 넘쳐" -> "물(은|는|이|가|을|를|도|에|에서|로|으로)?.*넘쳐" 로 변환
            if " " in keyword_lower:
                # 각 단어 뒤에 한국어 조사가 붙을 수 있음을 명시적으로 허용
                words = keyword_lower.split()
                regex_words = [re.escape(w) + r"(?:은|는|이|가|을|를|도|에|에서|로|으로)?" for w in words]
                
                # 단어 사이사이에 '최대 10글자 이내의 어떤 문자열'이 와도 매칭되도록 허용
                pattern = r".{0,10}".join(regex_words)
                if re.search(pattern, text_lower):
                    return {
                        "category": category,
                        "matched_keyword": keyword,
                        "severity": config["severity"],
                    }
            
            # 3. 공백이 없는 단일 키워드라도 단어 뒤에 조사가 붙는 경우 정규식으로 한 번 더 확인
            if " " not in keyword_lower:
                pattern = re.escape(keyword_lower) + r"(?:은|는|이|가|을|를|도|에|에서|로|으로)?"
                if re.search(pattern, text_lower):
                    return {
                        "category": category,
                        "matched_keyword": keyword,
                        "severity": config["severity"],
                    }
                    
    return None


def get_emergency_reply(category: str, language: str = "ko") -> str:
    """긴급 상황 카테고리에 맞는 다국어 응답을 반환한다."""
    lang = (language or "ko").lower()
    if lang not in ("ko", "en"):
        lang = "en"
    return EMERGENCY_REPLIES.get(category, {}).get(lang, EMERGENCY_REPLIES[category]["en"])
