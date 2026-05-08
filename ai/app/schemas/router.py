from pydantic import BaseModel, Field
from typing import Optional

class RouterOutputSchema(BaseModel):
    """
    메인 라우터(Front Desk)가 사용자 입력의 의도를 최우선으로 판단할 때 사용하는 전용 스키마
    """
    mode: str = Field(
        description="처리 모드 (TASK: 직원이 출동해야 하는 업무 요청, CHITCHAT: 단순 인사/일상 대화, CLARIFICATION: 의미가 모호하여 되물어야 하는 경우, INFO: 단순 정보 문의, CANCEL: 요청 취소, STATUS_CHECK: 이전 요청의 진행 상황/예상 소요 시간 문의)"
    )
    domain: Optional[str] = Field(
        default=None, 
        description="담당 부서 코드 (HK, FB, FACILITY, CONCIERGE, FRONT, EMERGENCY). mode가 TASK 또는 INFO일 때 값이 존재함."
    )
    confidence: float = Field(
        description="도메인 및 모드 분류 확신도 (0.0 ~ 1.0)"
    )
    reasoning: str = Field(
        description="이 도메인/모드로 분류한 논리적 이유 (개발자 디버깅 및 로깅용)"
    )
    action_type: str = Field(
        default="ADD",
        description="요청 유형: ADD(새로운 요청 추가) 또는 REPLACE(이전 요청을 수정/변경). 고객이 '아니', '바꿔줘', '대신', '말고' 등으로 기존 요청을 번복하면 REPLACE, 그 외에는 ADD."
    )
