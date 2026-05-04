-- ============================================================
-- 아늑(Aneuk) 호텔 AI 컨시어지 — DDL (PostgreSQL 16 + pgvector)
-- ============================================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1. 코드/룩업 테이블
-- ============================================================

-- 부서
CREATE TABLE IF NOT EXISTS department (
    id          VARCHAR(20)  PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,
    is_admin    BOOLEAN      NOT NULL DEFAULT FALSE
);

-- 직원 역할
CREATE TABLE IF NOT EXISTS staff_role (
    id            BIGSERIAL    PRIMARY KEY,
    department_id VARCHAR(20)  NOT NULL REFERENCES department(id),
    name          VARCHAR(50)  NOT NULL
);

-- ============================================================
-- 2. ANOOK 핵심 엔티티 테이블
-- ============================================================

-- 객실 (ANOOK) — 호실 번호만 보유. PMS에서 목록 수신.
CREATE TABLE IF NOT EXISTS room (
    number      VARCHAR(10)  PRIMARY KEY
);

-- 직원
CREATE TABLE IF NOT EXISTS staff (
    id              BIGSERIAL    PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    pin             VARCHAR(10)  NOT NULL UNIQUE,
    role_id         BIGINT       NOT NULL REFERENCES staff_role(id),
    department_id   VARCHAR(20)  NOT NULL REFERENCES department(id),
    jti             VARCHAR(100) -- 중복 로그인 방지를 위한 JWT ID
);

-- (guest 테이블은 pms_guest로 통합됨 — 아래 PMS 섹션 참조)

-- ============================================================
-- 3. 요청/메시지 테이블
-- ============================================================

-- 고객 요청 (핵심 테이블)
CREATE TABLE IF NOT EXISTS request (
    id                  BIGSERIAL    PRIMARY KEY,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    priority            VARCHAR(10)  NOT NULL DEFAULT 'NORMAL',
    department_id       VARCHAR(20)  NOT NULL REFERENCES department(id),
    entities            JSONB,
    raw_text            TEXT,
    summary             TEXT,
    confidence          REAL,
    room_no             VARCHAR(10)  NOT NULL REFERENCES room(number),
    assigned_staff_id   BIGINT       REFERENCES staff(id),
    version             INT          NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- AI 대화 메시지
CREATE TABLE IF NOT EXISTS message (
    id                  BIGSERIAL    PRIMARY KEY,
    sender_type         VARCHAR(10)  NOT NULL,
    content             TEXT         NOT NULL,
    translated_content  TEXT,
    room_no             VARCHAR(10)  NOT NULL REFERENCES room(number),
    request_id          BIGINT       REFERENCES request(id),
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. AI 지식/학습 테이블
-- ============================================================

-- RAG 지식 DB (벡터 검색)
CREATE TABLE IF NOT EXISTS knowledge_entry (
    id              BIGSERIAL    PRIMARY KEY,
    question        TEXT         NOT NULL,
    answer          TEXT         NOT NULL,
    embedding       vector(768),
    domain_code     VARCHAR(20),
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    approved_by     BIGINT       REFERENCES staff(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 미답변 질문 (플라이휠)
CREATE TABLE IF NOT EXISTS unanswered_question (
    id                  BIGSERIAL    PRIMARY KEY,
    question            TEXT         NOT NULL,
    domain_code         VARCHAR(20),
    cluster_id          VARCHAR(50),
    suggested_answer    TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- AI 자가 튜닝용 Few-Shot 데이터
CREATE TABLE IF NOT EXISTS fewshot_example (
    id              BIGSERIAL    PRIMARY KEY,
    input_text      TEXT         NOT NULL,
    correct_output  JSONB        NOT NULL,
    domain_code     VARCHAR(20)  NOT NULL,
    corrected_by    BIGINT       REFERENCES staff(id),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. 운영/감사 테이블
-- ============================================================

-- 교대 인수인계 브리핑 (AI 자동 생성)
CREATE TABLE IF NOT EXISTS handover_briefing (
    id                      BIGSERIAL    PRIMARY KEY,
    shift_start             TIMESTAMP    NOT NULL,
    shift_end               TIMESTAMP    NOT NULL,
    total_request_count     INT          NOT NULL DEFAULT 0,
    pending_count           INT          NOT NULL DEFAULT 0,
    escalated_count         INT          NOT NULL DEFAULT 0,
    summary                 TEXT,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 실시간 알림 발송 이력 (감사 로그)
CREATE TABLE IF NOT EXISTS dispatch_log (
    id          BIGSERIAL    PRIMARY KEY,
    target      VARCHAR(100) NOT NULL,
    event_type  VARCHAR(30)  NOT NULL,
    payload     TEXT,
    sent_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. PMS 테이블 (발표용 더미 데이터 — ANOOK과 분리)
-- ============================================================

-- PMS 객실
CREATE TABLE IF NOT EXISTS pms_room (
    number      VARCHAR(10)  PRIMARY KEY,
    type        VARCHAR(20)  NOT NULL
);

-- PMS 투숙객 (개인정보 포함 — ANOOK 접근 불가)
CREATE TABLE IF NOT EXISTS pms_guest (
    id              BIGSERIAL       PRIMARY KEY,
    room_no         VARCHAR(10)     NOT NULL UNIQUE
                                    REFERENCES pms_room(number)
                                    ON DELETE CASCADE,
    name            VARCHAR(50)     NOT NULL,
    phone           VARCHAR(20),
    access_code     VARCHAR(100)    UNIQUE,
    checkin_date    TIMESTAMP       NOT NULL DEFAULT NOW(),
    checkout_date   DATE            NOT NULL
);

-- PMS 메뉴 (룸서비스 메뉴 마스터)
CREATE TABLE IF NOT EXISTS pms_menu (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    price       INTEGER      NOT NULL,
    category    VARCHAR(30)  NOT NULL,
    allergens   VARCHAR(200),
    available   BOOLEAN      NOT NULL DEFAULT TRUE
);

-- PMS 영수증 (룸서비스 주문 내역 — 결제 관리)
CREATE TABLE IF NOT EXISTS pms_receipt (
    id          BIGSERIAL    PRIMARY KEY,
    room_no     VARCHAR(10)  NOT NULL REFERENCES pms_room(number),
    menu_id     BIGINT       NOT NULL REFERENCES pms_menu(id),
    quantity    INTEGER      NOT NULL DEFAULT 1,
    total_price INTEGER      NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'UNPAID',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. 인덱스
-- ============================================================

-- 요청 조회 성능
CREATE INDEX IF NOT EXISTS idx_request_status ON request(status);
CREATE INDEX IF NOT EXISTS idx_request_room_no ON request(room_no);
CREATE INDEX IF NOT EXISTS idx_request_department_id ON request(department_id);
CREATE INDEX IF NOT EXISTS idx_request_created_at ON request(created_at DESC);

-- 메시지 조회 성능
CREATE INDEX IF NOT EXISTS idx_message_room_no ON message(room_no);
CREATE INDEX IF NOT EXISTS idx_message_request_id ON message(request_id);

-- 지식 도메인별 필터링
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON knowledge_entry(domain_code);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_entry(status);
CREATE INDEX IF NOT EXISTS idx_unanswered_status ON unanswered_question(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_sent_at ON dispatch_log(sent_at DESC);

-- PMS 영수증 조회 성능
CREATE INDEX IF NOT EXISTS idx_receipt_room_no ON pms_receipt(room_no);
CREATE INDEX IF NOT EXISTS idx_receipt_status ON pms_receipt(status);

-- ============================================================
-- 8. 스키마 마이그레이션 (신규 컬럼/인덱스)
-- ============================================================
-- ↓↓↓ 새 변경사항은 날짜와 작성자를 기록하고 여기에 추가하세요 ↓↓↓
-- 참고: docs/DB_스키마_변경_가이드.md

-- 예시:
-- [2026-05-04] staff 테이블에 jti 컬럼 추가 (중복 로그인 방지용)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS jti VARCHAR(100);
-- [2026-05-04] pms_guest 테이블에 QR 로그인용 access_code 컬럼 추가
ALTER TABLE pms_guest ADD COLUMN IF NOT EXISTS access_code VARCHAR(100) UNIQUE;
