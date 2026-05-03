# DB 스키마 변경 가이드 (무중단 자동 마이그레이션)

> **목표**: 배포할 때 DB를 날리지 않고도 스키마(테이블/컬럼) 변경과 데이터 변경이 **자동으로 반영**되도록 한다.

---

## 📌 핵심 원칙

```
✅  CREATE TABLE IF NOT EXISTS   → 테이블 없으면 생성
✅  ALTER TABLE ADD COLUMN IF NOT EXISTS   → 컬럼 없으면 추가
✅  INSERT ... ON CONFLICT (...) DO UPDATE   → 데이터 없으면 삽입, 있으면 갱신
❌  DROP TABLE / DROP COLUMN   → 운영 데이터 날아감, 절대 금지
❌  CREATE TABLE (IF NOT EXISTS 없이)   → 이미 테이블 있으면 에러 → 앱 종료
```

---

## 1. schema.sql 수정 규칙

### 1-1. 새 테이블 추가

```sql
-- ✅ 올바른 방법: IF NOT EXISTS 필수
CREATE TABLE IF NOT EXISTS new_table (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### 1-2. 기존 테이블에 컬럼 추가 ⭐ 가장 중요

`CREATE TABLE IF NOT EXISTS`는 테이블이 이미 있으면 **아무것도 안 합니다**.
새 컬럼을 추가하려면 반드시 **`ALTER TABLE`을 별도로** 작성해야 합니다.

```sql
-- ✅ 올바른 방법: ALTER TABLE + ADD COLUMN IF NOT EXISTS
-- schema.sql 맨 아래 "8. 스키마 마이그레이션" 섹션에 추가

-- [2026-05-04] request 테이블에 language 컬럼 추가 (작성자: 홍길동)
ALTER TABLE request ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ko';

-- [2026-05-04] message 테이블에 is_read 컬럼 추가 (작성자: 홍길동)
ALTER TABLE message ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
```

```sql
-- ❌ 잘못된 방법: CREATE TABLE 안에만 추가하고 ALTER TABLE 안 씀
CREATE TABLE IF NOT EXISTS request (
    ...
    language VARCHAR(10) DEFAULT 'ko'   -- ← 테이블 이미 있으면 이 줄은 실행 안 됨!
);
```

### 1-3. 새 인덱스 추가

```sql
-- ✅ 올바른 방법: IF NOT EXISTS 필수
CREATE INDEX IF NOT EXISTS idx_request_language ON request(language);
```

### 1-4. 컬럼 타입 변경

```sql
-- ✅ ALTER TABLE로 타입 변경 (주의: 기존 데이터 호환성 확인 필요)
ALTER TABLE request ALTER COLUMN summary TYPE TEXT;

-- ⚠️ 타입 변환이 불가능한 경우 (예: TEXT → INTEGER) USING 절 필요
ALTER TABLE request ALTER COLUMN confidence TYPE DOUBLE PRECISION USING confidence::DOUBLE PRECISION;
```

### 1-5. schema.sql 구조 (권장)

```sql
-- ============================================================
-- 1~7. 기존 CREATE TABLE / CREATE INDEX (그대로 유지)
-- ============================================================

...기존 코드...

-- ============================================================
-- 8. 스키마 마이그레이션 (신규 컬럼/인덱스 추가)
-- ============================================================
-- ↓↓↓ 새 변경사항은 여기에 날짜와 함께 추가 ↓↓↓

-- [2026-05-04] request 테이블에 language 컬럼 추가
ALTER TABLE request ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ko';

-- [2026-05-10] pms_guest에 vip_level 컬럼 추가
ALTER TABLE pms_guest ADD COLUMN IF NOT EXISTS vip_level VARCHAR(10) DEFAULT 'NORMAL';
```

---

## 2. data.sql 수정 규칙

### 2-1. 고정 마스터 데이터 (부서, 역할 등) — UPSERT 사용

```sql
-- ✅ 올바른 방법: ON CONFLICT DO UPDATE (있으면 최신 값으로 갱신)
INSERT INTO department (id, name, is_admin) VALUES
    ('HK',        '하우스키핑',   FALSE),
    ('FB',        '식음료',       FALSE),
    ('FACILITY',  '시설관리',     FALSE),
    ('CONCIERGE', '컨시어지',     FALSE),
    ('FRONT',     '프론트데스크', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_admin = EXCLUDED.is_admin;
```

```sql
-- ⚠️ 현재 방법: ON CONFLICT DO NOTHING (값 변경 시 반영 안 됨)
INSERT INTO department (id, name, is_admin) VALUES (...)
ON CONFLICT (id) DO NOTHING;   -- ← 부서명 바꿔도 기존 DB에 반영 안 됨
```

### 2-2. PK 없는 테이블에 INSERT — 중복 방지

`request`처럼 id를 자동 생성(BIGSERIAL)하는 테이블은 `ON CONFLICT`를 쓸 수 없습니다.
중복 삽입을 방지하려면 **NOT EXISTS** 조건을 사용합니다.

```sql
-- ✅ 올바른 방법: 이미 데이터가 있으면 삽입 스킵
INSERT INTO request (status, priority, department_id, summary, raw_text, confidence, room_no, version, created_at, updated_at)
SELECT 'PENDING', 'NORMAL', 'HK', '수건 2장 추가 요청', '수건 두 장만 더 주세요', 0.95, '707', 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM request WHERE summary = '수건 2장 추가 요청' AND room_no = '707');
```

### 2-3. 시퀀스 동기화 (수동 ID INSERT 후 필수)

```sql
-- ✅ 수동으로 id를 지정해서 INSERT 한 후에는 반드시 시퀀스 동기화
SELECT setval('staff_id_seq', (SELECT COALESCE(MAX(id), 1) FROM staff));
SELECT setval('staff_role_id_seq', (SELECT COALESCE(MAX(id), 1) FROM staff_role));
```

---

## 3. 체크리스트: 스키마 변경 시

새 컬럼이나 테이블을 추가할 때 아래 순서를 따르세요:

### Step 1: schema.sql 수정
- [ ] `CREATE TABLE IF NOT EXISTS`로 새 테이블 추가 (필요 시)
- [ ] `ALTER TABLE ADD COLUMN IF NOT EXISTS`로 새 컬럼 추가
- [ ] `CREATE INDEX IF NOT EXISTS`로 새 인덱스 추가
- [ ] 날짜와 작성자를 주석으로 기록

### Step 2: data.sql 수정
- [ ] 새 컬럼에 대한 초기 데이터 필요 시 UPSERT로 추가
- [ ] 시퀀스 동기화 확인

### Step 3: JPA Entity 수정
- [ ] 새 컬럼에 대응하는 `@Column` 필드 추가
- [ ] `toDomain()` / `fromDomain()` 변환 메서드 업데이트

### Step 4: 로컬 테스트
- [ ] `docker compose up -d`로 기존 DB 유지한 채 재시작
- [ ] 새 컬럼이 정상 반영되었는지 확인
- [ ] `docker compose down -v` 후 처음부터 생성해도 정상 동작하는지 확인

---

## 4. 실전 예시: request 테이블에 language 컬럼 추가

### schema.sql (맨 아래 마이그레이션 섹션에 추가)

```sql
-- [2026-05-04] request 테이블에 다국어 지원을 위한 language 컬럼 추가
ALTER TABLE request ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ko';
CREATE INDEX IF NOT EXISTS idx_request_language ON request(language);
```

### data.sql (테스트 데이터에 language 값 추가 — 선택)

```sql
-- 기존 테스트 request에 language 값 업데이트
UPDATE request SET language = 'ko' WHERE language IS NULL;
```

### RequestJpaEntity.java

```java
@Column(name = "language", length = 10)
private String language = "ko";
```

---

## ⚠️ 주의사항

1. **`DROP TABLE` / `DROP COLUMN`은 절대 사용 금지**
   - 운영 데이터가 삭제됩니다
   - 컬럼을 제거하고 싶으면 코드에서만 제거하고, DB에는 남겨두세요

2. **NOT NULL 컬럼 추가 시 반드시 DEFAULT 값 필요**
   ```sql
   -- ❌ 기존 행에 값이 없어서 에러
   ALTER TABLE request ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL;

   -- ✅ DEFAULT 값 지정
   ALTER TABLE request ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'ko';
   ```

3. **FK(외래 키) 컬럼 추가 시 참조 테이블이 먼저 존재해야 함**
   ```sql
   -- schema.sql에서 참조 테이블이 위에 있는지 확인
   ALTER TABLE request ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES category(id);
   ```

4. **`ON CONFLICT DO NOTHING` vs `ON CONFLICT DO UPDATE`**
   - `DO NOTHING`: 값 변경이 필요 없는 경우 (예: room 번호)
   - `DO UPDATE`: 마스터 데이터처럼 값이 바뀔 수 있는 경우 (예: 부서명, 메뉴 가격)
