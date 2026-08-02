# 아늑(Anook) 포트폴리오 데모 로그인 팝업 — 현황 분석 및 설계안

> 목적: 포트폴리오 방문자가 "코드가 뭔지 몰라서" 못 들어오는 문제를 없앤다.
> 랜딩에서 팝업 하나로 **게스트 / 직원 / 관리자** 중 하나를 골라 원클릭 진입.

---

## 1. 현재 인증 구조 분석

### 1.1 전체 흐름

```
브라우저
  └─ nginx (443)  ──► frontend:3000  (Next.js = BFF)
                          ├─ iron-session 암호화 쿠키 발급/검증
                          └─ fetch ──► backend:8080 (Spring, JWT Bearer)
```

프론트엔드가 **BFF**라서 브라우저는 백엔드 JWT를 직접 보지 않는다.
JWT는 iron-session 쿠키 **안에** 암호화되어 들어간다.

### 1.2 핵심 파일

| 역할 | 파일 |
|---|---|
| 세션 정의 (쿠키명/암호화) | [frontend/src/lib/session.ts](frontend/src/lib/session.ts) |
| 라우팅 가드 (자동 리다이렉트) | [frontend/src/middleware.ts](frontend/src/middleware.ts) |
| 로그인 UI | [frontend/src/app/(auth)/login/_components/LoginForm/LoginForm.tsx](frontend/src/app/(auth)/login/_components/LoginForm/LoginForm.tsx) |
| 로그인 분기 로직 | [frontend/src/app/(auth)/login/_components/useLoginForm.ts](frontend/src/app/(auth)/login/_components/useLoginForm.ts) |
| 직원 로그인 BFF | [frontend/src/app/api/auth/staff/route.ts](frontend/src/app/api/auth/staff/route.ts) |
| 게스트 로그인 BFF | [frontend/src/app/api/auth/guest/route.ts](frontend/src/app/api/auth/guest/route.ts) |
| 세션 조회/파기 BFF | [frontend/src/app/api/auth/session/route.ts](frontend/src/app/api/auth/session/route.ts) |
| 직원 인증 (JTI 발급) | [backend/.../security/StaffAuthService.java](backend/src/main/java/com/anook/backend/security/StaffAuthService.java) |
| 게스트 인증 | [backend/.../security/GuestAuthService.java](backend/src/main/java/com/anook/backend/security/GuestAuthService.java) |
| JWT 필터 (중복로그인 차단) | [backend/.../security/JwtAuthFilter.java](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java) |
| 시드 계정 | [backend/src/main/resources/data.sql](backend/src/main/resources/data.sql) |

### 1.3 세션은 정확히 무엇인가

[lib/session.ts:19-26](frontend/src/lib/session.ts#L19-L26)

```ts
cookieName: "anook_session"
httpOnly: true
secure: NODE_ENV === "production" && DISABLE_SECURE_COOKIE !== "true"
```

- **서버 저장소(Redis/DB) 없음.** iron-session은 세션 내용을 AES로 암호화해 쿠키 자체에 담는다(stateless).
- 담기는 값: `token`(백엔드 JWT), `role`, `name`, `department`, `departmentId`, `roomNo`, `isLoggedIn`
- 만료: **24시간** — 쿠키 `maxAge`와 안쪽 JWT([application.yml:30](backend/src/main/resources/application.yml#L30))가 일치한다.

> **정정 이력 (2026-08-03):** 이 문서 초판에는 "maxAge 미지정 → 브라우저 세션 쿠키"라고 적혀 있었으나 **틀린 설명이었다.**
> iron-session은 `cookieOptions`에 `maxAge` 키가 없으면 기본 `ttl`(14일)에서 60초를 뺀 값을 자동으로 채워넣는다
> (`node_modules/iron-session/dist/index.cjs`의 `computeCookieMaxAge`).
> 즉 실제로는 **14일짜리 쿠키**였고, 안쪽 JWT는 24시간이라 **24시간~14일 사이에 "좀비 세션"** 구간이 있었다 —
> 쿠키가 살아있어 `isLoggedIn: true`인데 JWT는 만료되어 모든 데이터 API가 403이 되는 상태.
> 미들웨어의 verify 검사도 이걸 못 걸렀다(`/auth/**`가 `permitAll`이라 만료 토큰에도 200을 반환).
> → `lib/session.ts`에 `maxAge: 60 * 60 * 24`를 명시해 해소함.

### 1.4 진입 경로와 자동 라우팅 (← 지금 문제의 핵심)

1. `/` 접속 → **`/login`으로 302** ([next.config.ts:12-20](frontend/next.config.ts#L12-L20))
   - 참고: [app/page.tsx](frontend/src/app/page.tsx)는 `Hello world!`인 채로 남아있고, redirect 때문에 아무도 못 본다.
2. `/login` 진입 → 미들웨어가 **세션이 있으면 즉시 역할별 페이지로 리다이렉트** ([middleware.ts:18-27](frontend/src/middleware.ts#L18-L27))

```ts
if (pathname === "/login") {
  if (session.isLoggedIn) {
    let redirectUrl = "/staff";
    if (session.role === "FRONTDESK") redirectUrl = "/frontdesk/requests";
    if (session.role === "GUEST")     redirectUrl = "/guest/chat";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  ...
}
```

> **네가 걱정한 그 지점이 맞다.** 이 4줄 때문에, 한 번이라도 로그인한 브라우저는
> 이후 `/`나 `/login`을 눌러도 로그인 화면 자체가 **렌더링되지 않는다.**
> 팝업을 `/login` 페이지에 그냥 붙이면, 재방문자·역할 전환을 원하는 방문자는 영원히 못 본다.

### 1.5 로그인 코드 판별 방식

[useLoginForm.ts:19-58](frontend/src/app/(auth)/login/_components/useLoginForm.ts#L19-L58)

```
입력값이 /^\d{6}$/ 이면 → POST /api/auth/staff  (성공 시 종료)
그 외 또는 실패      → POST /api/auth/guest
```

역할별 목적지:
| role | 목적지 |
|---|---|
| `FRONTDESK` | `/frontdesk/requests` |
| `STAFF` | `/staff` |
| `GUEST` | `/guest/chat` |

### 1.6 이미 존재하는 시드 계정 (데모에 바로 쓸 수 있음)

[data.sql:36-67](backend/src/main/resources/data.sql#L36-L67), [data.sql:161-166](backend/src/main/resources/data.sql#L161-L166)

| 구분 | 코드 | 이름 | 부서 | 판정 role |
|---|---|---|---|---|
| 관리자 | `000000` | 최관리 | FRONT | **FRONTDESK** |
| 직원 | `111111` | 김직원 | HK | **STAFF** |
| 직원 | `1234` | 김아늑 | HK | ⚠️ **로그인 불가** |
| 게스트 | `test-guest-code-1234` | 김철수 (707호) | – | GUEST |
| 게스트 | `test-guest-code-1233` | 테스트 (101호) | – | GUEST |

> ⚠️ `1234`는 4자리라서 [useLoginForm.ts:20](frontend/src/app/(auth)/login/_components/useLoginForm.ts#L20)의 `/^\d{6}$/`를 통과 못 하고
> 게스트 코드로 처리돼 무조건 실패한다. 기존 버그. (데모엔 안 쓸 거라 무해하지만 기록)

### 1.7 이미 있는 UI 자산 (새로 만들 게 별로 없다)

| 컴포넌트 | 파일 | 비고 |
|---|---|---|
| `ModalOverlay` | [components/ui/Modal/ModalOverlay.tsx](frontend/src/components/ui/Modal/ModalOverlay.tsx) | Portal + ESC 닫기 + 오버레이 클릭 |
| `ModalCard` | [components/ui/Modal/ModalCard.tsx](frontend/src/components/ui/Modal/ModalCard.tsx) | `sm/md/lg`, title/subtitle/닫기버튼 |
| `ConfirmModal` | [components/ui/Modal/ConfirmModal.tsx](frontend/src/components/ui/Modal/ConfirmModal.tsx) | 패턴 참고용 |
| `Toast` + `showToast` | [stores/useUiStore.ts:59](frontend/src/stores/useUiStore.ts#L59) | 전역 토스트 |
| `Button` / `GlassButton` | [components/ui/Button/](frontend/src/components/ui/Button/) | |

스타일: **CSS Modules + CSS 변수** (Tailwind 아님). 다크 프리미엄 톤.

### 1.8 QR 자동 로그인 — 재활용할 좋은 선례

[app/pms/page.tsx:577](frontend/src/app/pms/page.tsx#L577) 이 만드는 QR은 `/chat?code=<accessCode>` 로 연결되고,
[app/chat/page.tsx:21-26](frontend/src/app/chat/page.tsx#L21-L26)이 그 코드로 **자동 로그인 후 이동**시킨다.

> 즉 "코드를 URL로 받아 자동 로그인" 패턴은 **이미 구현되어 동작 중**이다.
> 데모 팝업은 이걸 버튼으로 감싼 것에 불과하다. → 구현 난이도 매우 낮음.

---

## 2. 지금 구조에서 데모를 막는 진짜 장애물 5가지

### 🔴 장애물 1 — 세션이 살아있으면 로그인 화면이 안 뜬다
[middleware.ts:18-27](frontend/src/middleware.ts#L18-L27). 네가 지적한 그 문제. → 아래 방안 A/B/C가 이걸 다룬다.

### 🔴 장애물 2 — 직원/관리자는 *동시 접속 자체가 불가능*하다 (가장 중요)

이건 네가 아직 모르는 문제인데, **데모의 성패를 가른다.**

[StaffAuthService.java:43-55](backend/src/main/java/com/anook/backend/security/StaffAuthService.java#L43-L55) — 로그인할 때마다 새 `jti`(UUID)를 만들어 **DB의 staff 행에 덮어쓴다.**
[JwtAuthFilter.java:59-71](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L59-L71) — 요청마다 토큰의 jti와 DB의 jti를 비교, 다르면 `DUPLICATE_LOGIN` 401.

결과:

```
방문자 A가 000000으로 관리자 데모 시작   → DB jti = A
방문자 B가 000000으로 관리자 데모 시작   → DB jti = B (덮어씀)
방문자 A가 아무 버튼이나 클릭            → 401 DUPLICATE_LOGIN
                                        → 세션 삭제 + /login으로 강제 추방
```

**면접관 두 명이 동시에 포트폴리오를 보면 서로를 튕겨낸다.** 반드시 해결해야 한다.
(게스트는 JTI 검사가 없어서 [JwtAuthFilter.java:47-58](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L47-L58) 동시 접속 안전.)

### 🟡 장애물 3 — 데모 게스트가 방문자에 의해 삭제될 수 있다

게스트 세션 유효성은 "pms_guest 행이 존재하는가"로만 판정한다([JwtAuthFilter.java:49-52](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L49-L52)).
방문자가 관리자 데모 중 **PMS에서 707호를 체크아웃**하면 `test-guest-code-1234`가 영구 사망하고,
이후 모든 방문자의 게스트 데모가 깨진다. (자동 복구 스케줄러 없음 — `@Scheduled`는 SSE/환율뿐)

### 🟡 장애물 4 — 데모 데이터 오염 누적

방문자들이 태스크를 완료/삭제/지식 수정하면 다음 방문자는 텅 빈 대시보드를 본다.
포트폴리오는 "첫 화면이 풍성한가"가 전부라서 치명적.

### 🔴 장애물 5 — `/pms/**`는 지금 **인증이 아예 없다** (신규 발견)

[SecurityConfig.java:40-49](backend/src/main/java/com/anook/backend/config/SecurityConfig.java#L40-L49)

```java
.requestMatchers("/frontdesk/**").hasRole("FRONTDESK")
.requestMatchers("/staff/**").hasRole("STAFF")
.requestMatchers("/chat/**").hasRole("GUEST")
.anyRequest().permitAll()        // ← /pms/** 가 여기로 떨어진다
```

`/pms/**`에 매칭되는 룰이 없어서 `.anyRequest().permitAll()`로 통과한다.
프론트 미들웨어의 matcher([middleware.ts:88-93](frontend/src/middleware.ts#L88-L93))에도 `/pms`가 없어서 화면도 안 막힌다.

결과 — **로그인 없이 아무나** 다음을 호출할 수 있다:

| 엔드포인트 | 동작 |
|---|---|
| `POST /pms/guests` ([PmsGuestController.java:38](backend/src/main/java/com/anook/backend/pms/adapter/in/web/PmsGuestController.java#L38)) | 체크인 (객실 점유) |
| `DELETE /pms/guests/{id}` ([:44](backend/src/main/java/com/anook/backend/pms/adapter/in/web/PmsGuestController.java#L44)) | **체크아웃 = 투숙객 hard delete** |
| `PATCH /pms/receipts/pay-all` ([PmsReceiptController.java:54](backend/src/main/java/com/anook/backend/pms/adapter/in/web/PmsReceiptController.java#L54)) | 일괄 결제 처리 |

즉 장애물 3은 "일어날 수도 있는 일"이 아니라 **URL만 아는 누구나 트리거할 수 있는 일**이다.

#### 📌 결정: 고치지 않고 둔다 (의도적 보류)

포트폴리오 데모라 실제 피해가 없고, `/pms` 경로를 모르면 도달할 수 없으므로 **현 상태 유지**한다.

**그래도 §5-B는 정상 동작한다.** 데모 방문자는 UI를 통해 움직이고, BFF가 세션의 JWT를
`Authorization` 헤더로 붙여주므로([api/[...path]/route.ts:38-40](frontend/src/app/api/[...path]/route.ts#L38-L40))
`demo: true` 클레임이 인터셉터에 그대로 도달한다. **버튼을 누르는 방문자는 정상적으로 차단된다.**

**남는 잔여 리스크:** 로그인하지 않은 채 `/pms`에 직접 들어가 체크아웃을 누르는 경우.
이때는 토큰이 없어 `demo` 클레임도 없으므로 그냥 통과한다 → 데모 게스트 사망(장애물 3).
빈도가 낮다고 보고 감수하되, **§5의 ㉠ 시드 리셋 크론이 사후 복구 수단**이 된다.

> 나중에 마음이 바뀌면 한 줄이면 된다:
> `.requestMatchers("/pms/**").hasRole("FRONTDESK")` + 프론트 matcher에 `/pms/:path*` 추가.

---

## 3. 제안 — 팝업은 `/login`에 둔다. 관건은 "어떻게 항상 보이게 하느냐"

**전제(확정):** 인덱스 페이지는 신설하지 않는다.
`/`는 어차피 `/login`으로 리다이렉트되고 모든 동선이 거기로 수렴하므로, **데모 팝업은 로그인 페이지에 붙인다.**
[app/page.tsx](frontend/src/app/page.tsx)의 `Hello world!`는 그대로 두거나 삭제해도 무방하다.

그러면 남는 문제는 **딱 하나**다 — §1.4의 그 4줄.

```ts
// middleware.ts:18-27  ← 세션이 있으면 /login이 렌더링조차 안 된다
if (pathname === "/login") {
  if (session.isLoggedIn) { return NextResponse.redirect(역할별_URL); }
  return NextResponse.next();
}
```

이 분기를 어떻게 바꿀 것인가에 대한 3가지 안.

---

### 방안 A-1. `/login` 진입 시 세션 무조건 파기 (네 원래 아이디어)

```ts
if (pathname === "/login") {
  const res = NextResponse.next();
  res.cookies.delete(sessionOptions.cookieName);   // 항상 초기화
  return res;
}
```

| 장점 | 단점 |
|---|---|
| 변경량 4줄. 가장 단순하고 예측 가능 | 데모 보다가 로고 클릭 등으로 `/login` 가면 **말없이 로그아웃** |
| "로그인 화면 = 항상 백지 상태" — 상태 조합이 1개뿐이라 버그 여지 없음 | 관람 중 이탈감이 생김 |
| QR 흐름(`/chat?code=`)은 matcher 밖이라 안 깨짐 | |

---

### 방안 A-2. ⭐ 리다이렉트만 제거하고 세션은 살려둔다 (권장)

파기하지 말고, **리다이렉트만 없앤다.** 세션이 있으면 로그인 폼 위에 배너를 얹는다.

```ts
if (pathname === "/login") {
  return NextResponse.next();   // 로그인 여부와 무관하게 항상 렌더
}
```

```
┌─────────────────────────────────────────┐
│  현재 '최관리(관리자)'로 접속 중입니다      │
│         [이어서 보기]  [역할 바꾸기]       │
└─────────────────────────────────────────┘
              ANOOK  [ 코드 입력 ]
        ─────────  또는  ─────────
        🏨 관리자   👷 직원   🧑 투숙객   ← 데모 팝업/버튼
```

세션 파기는 **데모 버튼을 실제로 눌렀을 때만** 일어난다(사실 `session.save()`가 덮어쓰므로 명시적 파기도 불필요).

| 장점 | 단점 |
|---|---|
| 파괴적 동작이 없다 — 실수로 들어와도 **이어서 보기**로 복귀 가능 | A-1보다 상태가 2개(로그인/비로그인) → 배너 UI 한 덩어리 추가 |
| 역할 전환이 자연스러운 동선이 된다 | |
| A-1과 코드량 차이 사실상 없음 | |

**평가: 이걸 추천한다.** A-1의 장점을 다 가지면서 "말없이 로그아웃" 단점만 없앤다.

---

### 방안 A-3. 리다이렉트 유지 + 앱 안에 플로팅 런처 (병행 옵션)

미들웨어를 안 건드리고, 앱 **모든 화면 우하단**에 상주 버튼을 [layout.tsx](frontend/src/app/layout.tsx)에 추가.
클릭 → 같은 역할 선택 팝업 → 세션 교체.

| 장점 | 단점 |
|---|---|
| 인증 로직 **전혀 안 건드림** — 리스크 0 | 단독으로는 §1.4 문제를 못 푼다(첫 진입이 여전히 막힘) |
| 화면 어디서든 역할 전환 1클릭 | 실서비스 화면에 데모 UI가 얹혀 스크린샷이 지저분 |

**평가:** 단독 불가. **A-2에 얹는 부가 요소로만** 의미 있다. 스크린샷이 신경 쓰이면 생략해도 무방.

---

### (기각) `/`를 인트로 랜딩으로 신설

인덱스를 포트폴리오 소개 페이지로 만드는 안도 있었으나,
**동선이 어차피 `/login`으로 수렴하는데 페이지를 하나 더 만드는 건 중복**이라 기각.
서비스 소개 문구가 필요하면 로그인 화면의 `subtitle`/`footerContent`
([LoginForm.tsx:36-50](frontend/src/app/(auth)/login/_components/LoginForm/LoginForm.tsx#L36-L50))에 얹는 것으로 충분하다.

---

## 4. 제안 — 동시 접속(장애물 2) 해결

### 방안 ㉮ ⭐ 데모 계정은 JTI 검사 면제 (권장)

[JwtAuthFilter.java:59](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L59)의 STAFF/FRONTDESK 분기에 예외 한 줄.

```java
// 데모 계정(id in DEMO_STAFF_IDS)은 다중 동시 접속을 허용
boolean isDemoAccount = demoStaffIds.contains(staffId);
if (!isDemoAccount) {
    // 기존 JTI 비교 로직
}
```

`demoStaffIds`는 `application.yml`의 `anook.demo.staff-ids: 1,2` 같은 프로퍼티로 주입 → **운영에서는 빈 값으로 두면 자동 비활성**.

| 장점 | 단점 |
|---|---|
| 변경 10줄 미만, 완전 해결 | 백엔드 코드 수정 필요 |
| 중복로그인 기능 자체는 일반 계정에 **그대로 보존**(면접 어필 포인트 유지) | 데모 계정 id를 설정으로 관리해야 함 |

### 방안 ㉯ 데모 계정 풀 라운드로빈

`000001`~`000010` 데모 관리자 10개를 시드하고, 팝업이 순번으로 배정.

| 장점 | 단점 |
|---|---|
| 백엔드 무수정 | 11번째 동시 방문자부터 다시 충돌 |
| | 직원 관리 화면에 유령 계정 10개가 노출돼 지저분 |

### 방안 ㉰ 감수하고 안내만 개선

DUPLICATE_LOGIN 토스트 문구를 "다른 방문자가 데모 중입니다. 다시 시작해주세요"로 교체.

| 장점 | 단점 |
|---|---|
| 0줄 수정 | 면접관이 튕기는 순간 포트폴리오 신뢰도 하락 |

**권장: ㉮.** 비용 대비 효과가 압도적이다.

---

## 5. 제안 — 데모 데이터 보호 (장애물 3·4)

| 방안 | 내용 | 비용 |
|---|---|---|
| **㉠ 시드 리셋 크론** | 매일 새벽 `data.sql` 재적용. 대부분 `ON CONFLICT DO UPDATE`라 멱등적이고, 삭제된 게스트/오염 데이터가 복구된다 | 중 |
| ㉡ 데모 게스트 체크아웃 차단 | `CheckOutGuestService`에서 데모 access_code는 삭제 거부 | 소 |
| ㉢ 게스트 데모 = 즉석 체크인 | 팝업 클릭 시 빈 객실에 임시 게스트를 체크인해 방문자마다 독립 세션 부여. 단 `pms_guest.room_no`가 UNIQUE([schema.sql:172](backend/src/main/resources/schema.sql#L172))라 **동시 최대 23명** | 중 |
| ㉣ 방치 | – | 0 |

㉡은 "데모 게스트"라는 특수 케이스만 막는 땜질이다.
**호출하는 쪽의 권한을 제한하면 이 계열 문제를 한 번에 정리할 수 있다** → §5-B.

---

## 5-B. ⭐ 데모 전용 제한 계정 (`FRONTDESK_DEMO`) — 권장

> "PMS 같은 직접적인 DB 조작은 막힌, 프론트 **부**관리자 같은 계정"

㉡처럼 개별 서비스에 `if (데모)`를 흩뿌리는 대신, **권한 계층에서 한 번에** 막는 접근.

### 5-B.1 이미 절반은 만들어져 있다

`staff_role` 테이블에 역할이 이미 정의돼 있다 ([data.sql:20-33](backend/src/main/resources/data.sql#L20-L33)):

| id | department | name |
|---|---|---|
| 1 | FRONT | **직원** |
| 2 | FRONT | **관리자** |

그런데 [StaffAuthService.java:40](backend/src/main/java/com/anook/backend/security/StaffAuthService.java#L40)은 `role_id`를 **완전히 무시**한다:

```java
String role = staff.getDepartment().isFrontdesk() ? "FRONTDESK" : "STAFF";
//            ↑ 부서만 본다. staff.getRoleId()는 인증에 안 쓰임
```

즉 **"프론트 직원"과 "프론트 관리자"가 지금은 권한이 똑같다.**
DB는 이미 계층을 모델링해뒀는데 코드가 안 쓰고 있을 뿐 — 네 아이디어는 **이 미사용 설계를 실제로 켜는 것**에 가깝다.

### 5-B.2 무엇을 막을 것인가 — 두 가지 철학

데모 계정을 완전 읽기전용으로 만들면 안 된다. 태스크 수락/완료, 채팅 응답 같은 건
**직접 해봐야 서비스가 이해되는** 핵심 기능이다. 막아야 할 건 "되돌릴 수 없는 것"뿐이다.

| | 화이트리스트 (기본 차단) | 블랙리스트 (파괴적 동작만 차단) |
|---|---|---|
| 안전성 | 높음 | 누락 가능성 있음 |
| 데모 생동감 | 낮음 (허용 목록 다 열거해야 함) | 높음 |
| 유지보수 | 기능 추가할 때마다 목록 갱신 | 위험 API 생길 때만 갱신 |

**권장: 블랙리스트.** 차단 대상은:

| 차단 | 이유 |
|---|---|
| `DELETE /pms/guests/**` | 체크아웃 = 투숙객 hard delete → 장애물 3의 원인 |
| `POST /pms/guests` | 체크인. `room_no` UNIQUE라 23실 고갈 |
| `PATCH /pms/receipts/**` | 결제 상태 되돌리기 어려움 |
| `DELETE /frontdesk/staff/**` | 직원 삭제 |
| `DELETE /frontdesk/knowledge/**` | RAG 지식 삭제 |

**허용(그대로 둠):** 태스크 수락·완료·에스컬레이션, 채팅 송신, 인수인계 생성, 조회 전부.

### 5-B.3 구현 방식 3가지

**(가) JWT 클레임 + 쓰기 차단 필터** ⭐

`role`은 `FRONTDESK` 그대로 두고 `demo: true` 클레임만 추가.
[JwtAuthFilter](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java) 뒤에 인터셉터를 하나 붙여 위 블랙리스트를 403 처리.

- 장점: **기존 role·RoleHierarchy·SecurityConfig 전부 무수정.** 차단 목록이 파일 한 곳에 모임
- 단점: Spring Security의 정식 authz가 아니라 별도 관문이 생김

**(나) 새 role `FRONTDESK_DEMO` + RoleHierarchy 편입**

```java
roleHierarchy.setHierarchy("ROLE_FRONTDESK > ROLE_FRONTDESK_DEMO > ROLE_STAFF");
```

- 장점: Spring Security 표준. `hasRole`로 자연스럽게 표현
- 단점: `/frontdesk/**`의 `hasRole("FRONTDESK")`가 데모를 막아버림 → 경로 규칙을 **전면 재작성**해야 함. 작업량 급증

**(다) `role_id` 기반 정식 RBAC로 승격**

`staff_role`을 실제 권한 테이블로 쓰고 컨트롤러마다 `@PreAuthorize`.

- 장점: **면접 어필 최고** ("RBAC 설계했습니다"). 설계적으로 가장 옳음
- 단점: 컨트롤러 26개 전수 검토. 데모 목적 대비 명백한 오버엔지니어링

**권장: (가).** 지금 목적(포트폴리오 보호)에는 (가)가 압도적으로 비용 대비 효과가 좋다.
(다)는 나중에 시간 남을 때 리팩터링 주제로.

### 5-B.4 ⚠️ 전제조건과 한계

**전제:** 없음. §2 장애물 5(`/pms` 무인증)는 **보류하기로 결정**했고,
UI를 통해 들어오는 데모 방문자는 JWT의 `demo` 클레임으로 정상 차단되므로 이 방안은 그대로 성립한다.
(직접 `/pms` URL을 치고 들어오는 익명 접근만 잔여 리스크 — §2 장애물 5의 결정 항목 참조)

**한계 (중요):** 이 방안은 **장애물 3(게스트 삭제)은 완전히 해결하지만, 장애물 4(오염 누적)는 해결하지 못한다.**
태스크 완료는 허용할 거니까, 방문자들이 하나씩 처리하다 보면 대시보드는 결국 비어간다.
→ **㉠ 시드 리셋 크론은 여전히 필요하다.** 데모 계정은 ㉠을 대체하는 게 아니라 ㉡을 대체한다.

### 5-B.5 부수 효과

- 관리자 데모와 별개 계정이므로 **§2 장애물 2(JTI 충돌)와 무관하게 계정을 하나 더 확보**하는 효과
- "권한 설계를 고민했다"는 서사가 생겨 포트폴리오 자체의 설득력이 올라감
- `/pms` 취약점을 발견해 막았다는 것도 그대로 어필 포인트

---

## 6. 최종 추천 조합

> **A-2(리다이렉트 제거 + 로그인 화면에 데모 팝업) + ㉮(JTI 면제) + 5-B(가)(데모 제한 계정) + ㉠(시드 리셋)**
> A-3(플로팅 런처)은 선택.

데모 팝업의 "관리자" 카드는 `최관리(000000)`가 아니라 **제한 계정**으로 연결한다.

방문자 동선:

```
anoook.newlecture.com 접속
   ↓  (/ → /login, 세션 유무와 무관하게 이제 항상 렌더됨)
[로그인 화면]
   ├─ (세션 있으면) 상단 배너: "최관리로 접속 중 · [이어서 보기] [역할 바꾸기]"
   ├─ 기존 코드 입력창 (그대로 보존)
   └─ 데모 팝업 자동 오픈 ─ 🏨 관리자 / 👷 직원 / 🧑 투숙객
          ↓  "🏨 관리자로 체험하기" 클릭
   POST /api/auth/demo { role: "FRONTDESK" }   ← 실제 PIN은 서버만 안다
          ↓
   /frontdesk/requests  (실데이터 대시보드)
```

### 구현 체크리스트

**프론트엔드**
- [ ] [middleware.ts:18-27](frontend/src/middleware.ts#L18-L27) — `/login`의 `isLoggedIn → redirect` 분기 제거 (**핵심 1줄짜리 변경**)
- [ ] `app/api/auth/demo/route.ts` 신설 — `{ role }`만 받고 **실제 코드는 서버 env에 보관**
      (클라이언트 번들에 PIN을 박지 않기 위함. `DEMO_ADMIN_PIN`, `DEMO_STAFF_PIN`, `DEMO_GUEST_CODE`)
      내부 동작은 기존 `/api/auth/staff`·`/api/auth/guest`와 동일 (§1.8의 QR 자동로그인과 같은 패턴)
- [ ] `app/(auth)/login/_components/DemoModal.tsx` — `ModalOverlay` + `ModalCard` 재사용
- [ ] [LoginForm.tsx](frontend/src/app/(auth)/login/_components/LoginForm/LoginForm.tsx)에 마운트
      - 첫 방문 시 자동 오픈, `localStorage`로 "다시 보지 않기"
      - 폼 아래에 **"데모 계정으로 둘러보기"** 상시 버튼 → 언제든 재오픈
- [ ] 세션 보유 시 상단 배너 (`GET /api/auth/session`으로 판정) — [이어서 보기] / [역할 바꾸기]
- [ ] (선택, A-3) [layout.tsx](frontend/src/app/layout.tsx)에 플로팅 역할전환 런처

**백엔드**
- ~~`/pms/**` 인증 추가~~ → **보류 결정** (§2 장애물 5). 잔여 리스크는 ㉠ 크론으로 사후 복구
- [ ] [JwtAuthFilter.java:59-71](backend/src/main/java/com/anook/backend/security/JwtAuthFilter.java#L59-L71)에 데모 계정 JTI 면제 + `application.yml` 프로퍼티 (**이거 없으면 동시 관람이 깨진다**)
- [ ] [StaffAuthService.java:58](backend/src/main/java/com/anook/backend/security/StaffAuthService.java#L58) — 데모 계정이면 JWT에 `demo: true` 클레임 추가
- [ ] `DemoWriteGuardInterceptor` 신설 — §5-B.2 블랙리스트를 403 처리
- [ ] [data.sql](backend/src/main/resources/data.sql)에 데모 계정 시드 (예: PIN `999999`, 이름 `데모관리자`, `role_id=1`, FRONT)
- [ ] (선택) 시드 리셋 크론 — **데모 계정으로도 장애물 4는 안 막힌다 (§5-B.4)**

**부수 정리**
- [ ] `1234`(김아늑) 계정을 6자리로 바꾸거나 삭제 — 현재 로그인 불가 상태 (§1.6)
- [ ] [app/page.tsx](frontend/src/app/page.tsx)의 `Hello world!` — 리다이렉트에 가려 안 보이지만 정리 권장

**작업량 체감:** 미들웨어 1줄 + BFF 라우트 1개 + 모달 1개 + 배너 1개 + 백엔드 `if` 1개.
기존 컴포넌트(`ModalOverlay`/`ModalCard`/`Button`)와 자동로그인 패턴을 재사용하므로 반나절 규모.

---

## 7. 열린 질문 (결정 필요)

1. **팝업에 버튼을 3장 놓을지 2장 놓을지** (계정을 합치자는 얘기가 아님)
   - 3장: `[🧑 투숙객] [👷 직원] [🏨 관리자]` — 각각 **별개 계정**으로 로그인
   - 2장: 직원 카드를 빼고 투숙객·관리자만. `/staff` 화면이 관리자 화면 대비 볼 게 적으면 동선을 줄이는 게 나음
   - ※ 게스트+직원을 겸하는 계정은 **만들 수 없다.** 게스트는 `pms_guest`+`/auth/guest`,
     직원은 `staff`+`/auth/staff`로 인증 경로가 완전히 분리돼 있고 JWT `role`도 단일 값이다.
     역할 전환 = 재로그인(팝업 재오픈)뿐.
2. **팝업 자동 오픈 vs 버튼으로만** — 자동 오픈이 이탈을 줄이지만, 코드를 아는 실사용자에겐 성가시다. (`localStorage` 기억으로 절충 가능)
3. **데모 진입 후 워터마크 표시 여부** — "DEMO MODE" 배지를 띄우면 친절하지만 스크린샷은 지저분해진다.
4. **A-1 vs A-2** — 문서는 A-2(세션 살려두고 배너)를 추천하지만, "로그인 화면은 무조건 백지"가 더 깔끔하다고 보면 A-1도 충분히 합리적이다.
5. **데모 관리자에게 PMS 화면을 아예 숨길지, 보이되 버튼만 막을지** — 숨기면 깔끔하지만 PMS 연동이라는 구현 성과를 못 보여준다. **"보여주되 실행 시 '데모에서는 제한된 기능입니다' 토스트"가 어필상 유리**하다(§1.7의 `showToast` 재사용).
6. **진짜 관리자(`000000`)를 팝업에 노출할지** — 제한 계정만 노출하고 전체 권한 계정은 코드 입력으로만 두는 게 안전하다.
