from pydantic import BaseModel, Field
from typing import Dict, Any, List

class HotelRequestSchema(BaseModel):
    """
    아늑(Aneuk) 호텔 AI 시스템의 공통 JSON 응답 스키마
    모든 도메인 에이전트(HK, FB, FACILITY 등)는 이 규격에 맞추어 JSON을 반환해야 합니다.
    """
    # --- [1. 백엔드 DB & 직원 대시보드용 데이터 (ERD 호환)] ---
    request_id: str = Field(description="요청 고유 ID (예: REQ_1029)")
    room_no: str = Field(description="객실 번호 (예: 101)")
    
    domain: str = Field(description="담당 부서 코드 (HK, FB, FACILITY, CONCIERGE, FRONT, EMERGENCY)")
    
    summary: str = Field(description="직원용 Jira 대시보드 카드 제목으로 렌더링될 세 줄 요약")
    priority: str = Field(description="긴급도 (직원 UI 화면에 빨간색 긴급 뱃지로 표시: LOW, NORMAL, HIGH, URGENT)")
    status: str = Field(default="PENDING", description="티켓 상태 (PENDING, ASSIGNED, IN_PROGRESS, COMPLETED 등)")
    confidence: float = Field(description="AI 확신도 (0.0 ~ 1.0)")
    
    # --- [2. 챗봇 UX & 부서별 가변 데이터 (동적 데이터)] ---
    # [부서별 entities 작성 가이드]
    # 부서마다 달라지는 동적 데이터를 담는 주머니입니다.
    # 대시보드 '최다 요청 항목' 통계를 위해 'intent' 키는 모든 부서 필수입니다. (이거 꼭지키기)
    # 예시:
    #   HK:        {'intent': 'TOWEL', 'item': '수건', 'count': 2}
    #   FB:        {'intent': 'ROOM_SERVICE', 'menu': '콜라', 'price': 5000}
    #   FACILITY:  {'intent': 'AC_REPAIR', 'symptom': '안 켜짐', 'location': '침실'}
    #   CONCIERGE: {'intent': 'TAXI', 'destination': '인천공항', 'time': '14:00'}
    #   FRONT:     {'intent': 'CHECKOUT', 'requested_time': '11:00'}
    #   EMERGENCY: {'intent': 'FIRE', 'floor': '3층'}
    entities: Dict[str, Any] = Field(
        default_factory=dict, 
        description="부서마다 달라지는 동적 데이터 (대시보드 통계용 'intent' 키 필수 포함)"
    )
    missing_fields: List[str] = Field(
        default_factory=list, 
        description="필수 정보 중 누락된 항목 목록"
    )
    needs_clarification: bool = Field(
        default=False, 
        description="이 값이 true일 경우, 백엔드는 DB에 저장하지 않고 채팅창에 바로 질문을 튕겨냄"
    )
    clarification_question: str = Field(
        default="", 
        description="고객에게 되물을 구체적 질문 (예: '수건을 몇 개 가져다드릴까요?')"
    )
