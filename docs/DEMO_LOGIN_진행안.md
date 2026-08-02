# 아늑(Anook) 데모 로그인 팝업 — 최종 진행안

> 배경·근거·대안 비교는 [DEMO_LOGIN_설계안.md](DEMO_LOGIN_설계안.md) 참조.
> 이 문서는 **확정된 것만** 담은 실행 계획이다.

---

## 0. 확정 사항

| # | 항목 | 결정 |
|---|---|---|
| 1 | 팝업 위치 | **로그인 페이지(`/login`)**. 인덱스 랜딩 신설 안 함 |
| 2 | 팝업 버튼 | **2개** — `🧑 투숙객으로 체험` / `🏨 관리자로 체험` |
| 3 | 오픈 방식 | **매 방문 자동 오픈** + X 버튼으로 닫기 + 로그인 폼의 토글 버튼으로 재오픈 |
| 4 | 세션 처리 | **A-2** — 미들웨어의 `/login` 리다이렉트만 제거, 세션은 파기하지 않음. 세션 있으면 배너 표시 |
| 5 | 게스트 계정 | 기존 **707호 김철수** (`test-guest-code-1234`) 재사용 |
| 6 | 관리자 계정 | **신규 시드** — `데모관리자` / PIN `999999` / `role_id=1`(FRONT 부관리자) |
| 7 | 진짜 관리자(`000000`) | **팝업에 노출하지 않음.** 코드 직접 입력으로만 접근 |
| 8 | 동시 접속(JTI) | **`JwtAuthFilter`에서 데모 계정 JTI 검사 면제** |
| 9 | 워터마크 | 없음 |
| 10 | PMS 인증 | **건드리지 않음** (§설계안 장애물 5 — 의도적 보류) |

### 보류 (이번 범위 밖)

- 데모 쓰기 가드(`DemoWriteGuardInterceptor`) — 데모관리자의 체크아웃·삭제 차단
- 시드 리셋 크론 — 태스크 소진에 따른 대시보드 공백화 대비
- 게스트 즉석 체크인(방문자별 격리)

> **보류로 인해 남는 리스크:** 방문자가 PMS에서 707호를 체크아웃하면 게스트 데모가 깨진다.
> 복구 수단은 **백엔드 컨테이너 재기동** — `data.sql`이 `ON CONFLICT DO UPDATE`로 707호를 되살린다.

---

## 1. 변경 파일 목록

### 백엔드 (재배포 1회로 묶어서 처리)

| # | 파일 | 작업 |
|---|---|---|
| B1 | `backend/src/main/resources/data.sql` | 데모관리자 시드 추가 + 707호 `checkout_date` 갱신 |
| B2 | `backend/src/main/resources/application.yml` | `anook.demo.staff-pins` 프로퍼티 추가 |
| B3 | `backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java` | 데모 계정 JTI 검사 면제 |

### 프론트엔드

| # | 파일 | 작업 |
|---|---|---|
| F1 | `frontend/src/middleware.ts` | `/login`의 `isLoggedIn → redirect` 분기 제거 |
| F2 | `frontend/src/app/api/auth/demo/route.ts` | **신규** — 역할명만 받아 서버가 코드로 로그인 |
| F3 | `frontend/src/app/(auth)/login/_components/DemoModal/DemoModal.tsx` | **신규** — 역할 선택 모달 |
| F4 | `frontend/src/app/(auth)/login/_components/DemoModal/DemoModal.module.css` | **신규** |
| F5 | `frontend/src/app/(auth)/login/_components/LoginForm/LoginForm.tsx` | 모달 마운트 + 세션 배너 + 토글 버튼 |
| F6 | `frontend/src/app/(auth)/login/login.module.css` | 배너 스타일 추가 |

### 인프라

| # | 파일 | 작업 |
|---|---|---|
| I1 | `docker-compose.yml` | frontend에 `DEMO_ADMIN_PIN`/`DEMO_GUEST_CODE`, backend에 `DEMO_STAFF_PINS` |
| I2 | `.env.example` | 위 변수 문서화 |

**`components/ui/LoginForm/LoginForm.tsx`(공통 컴포넌트)는 수정하지 않는다** — 기존 `footerContent` 슬롯에 토글 버튼을 얹으면 된다.

---

## 2. 백엔드 상세

### B1. 데모관리자 시드 + 707호 정비

`data.sql`의 테스트 직원 블록 뒤에 추가:

```sql
-- ============================================================
-- 포트폴리오 데모 팝업 전용 계정
-- 진짜 관리자(000000)는 노출하지 않고, 이 계정만 팝업에 연결한다.
-- JTI 중복 로그인 검사는 application.yml의 anook.demo.staff-pins로 면제된다.
-- ============================================================
INSERT INTO staff (name, pin, role_id, department_id) VALUES
    ('데모관리자', '999999', 1, 'FRONT')
ON CONFLICT (pin) DO NOTHING;
```

`role_id=1`은 `(FRONT, '직원')` — "프론트 부관리자" 포지션.
화면 권한은 부서가 `FRONT`라 `FRONTDESK`로 동일하게 나온다([StaffAuthService.java:40](../backend/src/main/java/com/anook/backend/security/StaffAuthService.java#L40)).

707호 게스트의 `checkout_date`가 과거(`2024-12-31`)라 PMS 화면 표시가 어색하다.
기존 `ON CONFLICT` 절이 `access_code`만 갱신하므로 `checkout_date`도 함께 갱신하도록 수정:

```sql
INSERT INTO pms_guest (room_no, name, phone, access_code, checkout_date) VALUES
    ('707', '김철수',  '010-1234-5678', 'test-guest-code-1234', '2027-12-31'),
    ('101', '테스트',  '010-0000-0000', 'test-guest-code-1233', '2027-12-31')
ON CONFLICT (room_no) DO UPDATE SET
    access_code   = EXCLUDED.access_code,
    checkout_date = EXCLUDED.checkout_date;   -- ★ 추가
```

> 로그인 자체는 `checkout_date`를 검사하지 않으므로 기능엔 영향 없다. 표시용 정비다.

### B2. 프로퍼티 추가

`application.yml` 맨 아래:

```yaml
# 포트폴리오 데모 계정 — JTI(중복 로그인) 검사를 면제할 PIN 목록 (쉼표 구분)
# 운영 전환 시 빈 값으로 두면 기능이 완전히 비활성화된다.
anook:
  demo:
    staff-pins: ${DEMO_STAFF_PINS:999999}
```

### B3. JTI 검사 면제

`JwtAuthFilter`는 생성자 주입을 쓰는 `@Component`다. 생성자에 프로퍼티를 하나 추가한다.

```java
private final Set<String> demoStaffPins;

public JwtAuthFilter(JwtProvider jwtProvider,
                     StaffRepositoryPort staffRepositoryPort,
                     GuestRepositoryPort guestRepositoryPort,
                     @Value("${anook.demo.staff-pins:}") String demoStaffPins) {
    // ... 기존 대입 ...
    this.demoStaffPins = Arrays.stream(demoStaffPins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toSet());
}
```

그리고 STAFF/FRONTDESK 분기([JwtAuthFilter.java:59-78](../backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L59-L78))에서 JTI 비교를 감싼다:

```java
if (staffOpt.isPresent()) {
    // 데모 계정은 여러 방문자가 동시에 써야 하므로 단일 세션 강제를 면제한다.
    if (demoStaffPins.contains(staffOpt.get().getPin())) {
        log.debug("데모 계정 — JTI 검사 면제: staffId={}", identifier);
    } else {
        String dbJti = staffOpt.get().getJti();
        if (jti == null || !jti.equals(dbJti)) {
            log.warn("중복 로그인 감지: Staff={}, TokenJTI={}, DBJTI={}", identifier, jti, dbJti);
            sendErrorResponse(response, ErrorCode.DUPLICATE_LOGIN);
            return;
        }
    }
} else {
    isAuthorized = false;
}
```

> 기존 계정의 중복 로그인 차단은 **그대로 살아있다.** 예외 경로만 추가하는 형태라 회귀 위험이 낮다.
> `StaffAuthService`는 손대지 않는다 — 데모 계정도 jti를 계속 발급/저장하지만, 아무도 안 볼 뿐이다.

---

## 3. 프론트엔드 상세

### F1. 미들웨어 — `/login` 리다이렉트 제거

[middleware.ts:17-27](../frontend/src/middleware.ts#L17-L27)을 다음으로 교체:

```ts
// 1. 로그인 페이지는 세션 유무와 무관하게 항상 렌더한다.
//    (데모 팝업을 재방문자·역할 전환 시에도 볼 수 있어야 하므로)
//    세션은 파기하지 않는다 — 로그인 화면에서 "이어서 보기"로 복귀할 수 있다.
if (pathname === "/login") {
  return NextResponse.next();
}
```

**나머지 분기(보호 경로, 중복로그인 검증, 권한별 통제)는 전부 그대로 둔다.**
`matcher`도 변경 없음.

### F2. 데모 로그인 BFF — `app/api/auth/demo/route.ts` (신규)

실제 PIN/코드는 **서버에만** 둔다. 클라이언트는 `{ role: "ADMIN" | "GUEST" }`만 보낸다.

```ts
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";

const BACKEND_URL     = process.env.BACKEND_URL     || "http://localhost:8080";
const DEMO_ADMIN_PIN  = process.env.DEMO_ADMIN_PIN  || "999999";
const DEMO_GUEST_CODE = process.env.DEMO_GUEST_CODE || "test-guest-code-1234";

/**
 * POST /api/auth/demo
 * 포트폴리오 방문자용 원클릭 로그인.
 * 클라이언트는 역할명만 보내고, 실제 인증 코드는 서버 환경변수에서 읽는다.
 */
export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    const isAdmin = role === "ADMIN";
    const endpoint = isAdmin ? "/auth/staff" : "/auth/guest";
    const payload  = isAdmin
      ? { pin: DEMO_ADMIN_PIN }
      : { accessCode: DEMO_GUEST_CODE };

    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "데모 계정 준비 중입니다. 잠시 후 다시 시도해주세요." },
        { status: res.status }
      );
    }

    const data = await res.json();

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.token        = data.token;
    session.role         = data.role;
    session.name         = data.name;
    session.department   = data.department;
    session.departmentId = data.departmentId;
    session.roomNo       = data.roomNo;
    session.isLoggedIn   = true;
    await session.save();

    // 역할별 목적지는 기존 useLoginForm과 동일한 규칙
    const redirectTo =
      data.role === "FRONTDESK" ? "/frontdesk/requests"
      : data.role === "GUEST"   ? "/guest/chat"
      :                           "/staff";

    return NextResponse.json({ name: data.name, role: data.role, redirectTo });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json({ message: "서버 연결 오류가 발생했습니다." }, { status: 500 });
  }
}
```

> `session.save()`가 기존 세션을 덮어쓰므로 **역할 전환 시 별도 파기가 필요 없다.**

### F3. 데모 모달 — `DemoModal.tsx` (신규)

기존 `ModalOverlay`(Portal·ESC 닫기) + `ModalCard`(X 버튼 자동 생성)를 그대로 재사용한다.

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModalOverlay from '@/components/ui/Modal/ModalOverlay';
import ModalCard from '@/components/ui/Modal/ModalCard';
import styles from './DemoModal.module.css';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES = [
  {
    key: 'GUEST',
    emoji: '🧑',
    title: '투숙객으로 체험',
    desc: '707호 김철수님으로 접속합니다. AI 챗봇에 자유롭게 요청해보세요.',
  },
  {
    key: 'ADMIN',
    emoji: '🏨',
    title: '관리자로 체험',
    desc: '프론트데스크 대시보드에서 요청 현황과 AI 라우팅을 확인하세요.',
  },
] as const;

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePick = async (role: string) => {
    setLoadingRole(role);
    setError('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setLoadingRole(null);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalCard
        size="md"
        onClose={onClose}
        title="처음 오셨나요?"
        subtitle="접속 코드 없이 아래 계정으로 바로 둘러보실 수 있습니다."
      >
        <div className={styles.cards}>
          {ROLES.map((r) => (
            <button
              key={r.key}
              className={styles.roleCard}
              onClick={() => handlePick(r.key)}
              disabled={loadingRole !== null}
            >
              <span className={styles.emoji}>{r.emoji}</span>
              <strong className={styles.roleTitle}>
                {loadingRole === r.key ? '접속 중...' : r.title}
              </strong>
              <span className={styles.roleDesc}>{r.desc}</span>
            </button>
          ))}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </ModalCard>
    </ModalOverlay>
  );
}
```

**스타일 방향(F4):** 카드 2장을 가로 배치(모바일에서 세로 전환). 기존 다크 프리미엄 톤과
CSS 변수를 따르고, 다른 `*.module.css`의 변수명을 그대로 재사용한다.

### F5. 로그인 폼 — 모달 마운트 + 배너 + 토글

`app/(auth)/login/_components/LoginForm/LoginForm.tsx`에 추가:

```tsx
const [isDemoOpen, setIsDemoOpen] = useState(true);   // ★ 매 방문 자동 오픈
const [session, setSession] = useState<{ name?: string; role?: string } | null>(null);

// 세션이 살아있으면 배너로 알린다 (A-2: 파기하지 않는다)
useEffect(() => {
  fetch('/api/auth/session')
    .then((r) => (r.ok ? r.json() : null))
    .then(setSession)
    .catch(() => {});
}, []);

const roleToPath = (role?: string) =>
  role === 'FRONTDESK' ? '/frontdesk/requests'
  : role === 'GUEST'   ? '/guest/chat'
  :                      '/staff';
```

렌더:

```tsx
{session?.name && (
  <div className={styles.sessionBanner}>
    <span>현재 <strong>{session.name}</strong>님으로 접속 중입니다</span>
    <div>
      <button onClick={() => router.push(roleToPath(session.role))}>이어서 보기</button>
      <button onClick={() => setIsDemoOpen(true)}>역할 바꾸기</button>
    </div>
  </div>
)}

<CommonLoginForm
  /* ...기존 props 그대로... */
  footerContent={
    <>
      <button type="button" className={styles.demoTrigger} onClick={() => setIsDemoOpen(true)}>
        데모 계정으로 둘러보기
      </button>
      <p>© 2026 Team Anook. All rights reserved.</p>
      <p>관리자 문의: 02-1234-5678</p>
    </>
  }
/>

<DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
```

> 기존 `DUPLICATE_LOGIN` 에러 처리 `useEffect`는 그대로 둔다 — 일반 계정에는 여전히 필요하다.

---

## 4. 인프라 상세

`docker-compose.yml`:

```yaml
  backend:
    environment:
      # ... 기존 ...
      - DEMO_STAFF_PINS=${DEMO_STAFF_PINS:-999999}

  frontend:
    environment:
      # ... 기존 ...
      - DEMO_ADMIN_PIN=${DEMO_ADMIN_PIN:-999999}
      - DEMO_GUEST_CODE=${DEMO_GUEST_CODE:-test-guest-code-1234}
```

`.env.example`에 같은 키를 주석과 함께 기재한다.

> 기본값을 코드에 박아둬서 **`.env` 없이도 동작**한다. 값을 바꾸고 싶을 때만 `.env`에 넣으면 된다.

---

## 5. 작업 순서

1. **B1~B3 (백엔드)** — 시드·프로퍼티·필터를 한 번에 처리. 재빌드 1회로 끝낸다
2. **I1~I2 (환경변수)** — 컨테이너 기동 전에 넣어야 함
3. **F1 (미들웨어)** — 이거 없으면 팝업 테스트 자체가 불가
4. **F2 (데모 BFF)** — `curl`로 단독 검증 가능
5. **F3·F4 (모달)** — UI
6. **F5·F6 (폼 통합)** — 마무리

3~6은 프론트만 재빌드하면 되므로 백엔드와 독립적으로 반복 가능하다.

---

## 6. 검증 체크리스트

### 기능

- [ ] 비로그인 상태로 `/` 접속 → `/login`으로 이동 → **팝업 자동 오픈**
- [ ] X 버튼으로 닫기 → 폼 하단 "데모 계정으로 둘러보기" 클릭 → 다시 열림
- [ ] ESC 키 / 오버레이 클릭으로도 닫힘 (`ModalOverlay` 기본 동작)
- [ ] `🧑 투숙객으로 체험` → `/guest/chat` 진입, 707호 김철수로 표시, 기존 대화 이력 보임
- [ ] `🏨 관리자로 체험` → `/frontdesk/requests` 진입, 대시보드에 시드 데이터 보임
- [ ] 로그인 상태로 `/login` 재접속 → **리다이렉트되지 않고** 배너 표시
- [ ] 배너 `이어서 보기` → 원래 역할 페이지로 복귀
- [ ] 배너 `역할 바꾸기` → 팝업 열림 → 다른 역할 선택 시 정상 전환
- [ ] 기존 코드 로그인(`000000`, `test-guest-code-1234` 직접 입력)이 여전히 동작

### 동시 접속 (B3 핵심 검증)

- [ ] 일반 창 + 시크릿 창에서 **둘 다 `🏨 관리자로 체험`** 클릭
- [ ] 양쪽에서 메뉴를 번갈아 클릭해도 **둘 다 정상 동작** (튕김 없음)
- [ ] 같은 조건으로 `000000` 직접 로그인 시에는 **여전히 튕겨야 함** (기존 기능 보존 확인)

### 보안

- [ ] 브라우저 개발자도구 → Network/Sources에서 **PIN `999999`가 노출되지 않음**
      (클라이언트는 `{"role":"ADMIN"}`만 전송)
- [ ] 팝업 어디에도 진짜 관리자 `000000`이 언급되지 않음

---

## 7. 알려진 잔여 리스크 (수용하기로 한 것)

| 리스크 | 영향 | 대응 |
|---|---|---|
| `/pms` 무인증 → 707호 체크아웃 가능 | 게스트 데모 전면 중단 | 백엔드 재기동으로 복구 (`ON CONFLICT DO UPDATE`) |
| 데모관리자가 태스크를 모두 완료 | 다음 방문자가 빈 대시보드를 봄 | 시드 리셋 크론(보류) — 필요해지면 도입 |
| 게스트 방문자끼리 대화 이력 공유 | 남이 남긴 메시지가 보임 | 707호 단일 계정 사용에 따른 의도된 특성 |
| 데모관리자의 파괴적 동작 | 직원·지식 삭제 가능 | 쓰기 가드(보류) |
