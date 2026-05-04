# RAG 지식 관리 DB 스키마 리팩토링 제안서

본 문서는 현재 MVP 단계에서 `question`/`answer`로 명명된 내부 DB 스키마를 프론트엔드 UI 및 비즈니스 도메인 언어(Ubiquitous Language)에 맞춰 `title`/`content`로 직관화하기 위한 추후 리팩토링 계획안입니다.

현재는 팀원 간의 협업 충돌 방지 및 파이프라인 안정성을 위해 보류되었으나, 베타 오픈 전 또는 여유 스프린트에 진행할 것을 권장합니다.

## 1. 리팩토링 배경 및 목적
- **도메인 언어 불일치 해결:** 화면 설계서 및 프론트엔드 라벨은 "제목/내용"인 반면, 내부 DB 및 백엔드/AI 변수명은 "question/answer"로 되어 있어 개발 간 번역 및 인지 부하가 발생합니다.
- **데이터 성격의 확장성:** "환불 규정", "조식 시간" 등 단순 정보성 지식을 '질문'과 '답변'이라는 틀에 강제로 맞추는 것보다 '제목'과 '내용'으로 포괄하는 것이 개념적으로 더 적합합니다.

## 2. 변경 대상 및 영향도

### 2-1. 데이터베이스 (PostgreSQL)
- `knowledge_entry` 테이블 컬럼명 변경
  - `question` → `title`
  - `answer` → `content`
- **마이그레이션 전략:** `ALTER TABLE knowledge_entry RENAME COLUMN question TO title;` 등을 포함한 V2 마이그레이션 스크립트 작성 (`schema.sql` 업데이트)

### 2-2. 백엔드 (Spring Boot `knowledge` 모듈)
- **도메인 모델:** `KnowledgeEntry.java` 엔티티 내 변수명 및 Getter/Setter 변경
- **영속성 어댑터:** `KnowledgeJpaEntity.java` 컬럼 매핑 변경 (`@Column(name="title")`)
- **UseCase/DTO:** 생성/조회/수정 관련 Request/Response DTO의 필드명 변경 (`Question` → `Title`)
- **서비스 로직:** 관련된 Mapper 로직 및 서비스 코드 전면 수정

### 2-3. 파이프라인 / AI 모듈 (Python FastAPI)
- **DTO 스키마:** Pydantic 모델 내 `question`, `answer` 필드를 `title`, `content`로 수정
- **SQL 쿼리:** `ai/app/domains/rag/service.py` 내부의 SELECT, INSERT 구문 등 Raw Query 일괄 수정

### 2-4. 프론트엔드 (Next.js)
- **API 인터페이스:** API 통신에 사용되는 `fetch` 페이로드 및 응답 타입 정의 수정
- **컴포넌트 Props:** `KnowledgeItem`, `KnowledgeModal` 등으로 전달되는 Prop 네이밍 변경

## 3. 진행 가이드라인
1. **Feature Branch 생성:** `feature/refactor-knowledge-schema` 브랜치에서 통합 진행
2. **사전 공지:** 백엔드와 프론트엔드, AI 모듈 담당자가 모두 영향을 받으므로 Sprint 플래닝 시 전체 팀원 공지 필수
3. **배포 단계:** 로컬 환경에서 DB 스키마 엎기(`DROP TABLE`) 혹은 `ALTER` 적용 후 전체 통합 E2E 테스트 진행
