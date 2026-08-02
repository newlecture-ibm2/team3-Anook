import { SessionOptions } from "iron-session";

/**
 * 세션에 저장될 데이터의 타입 정의
 */
export interface SessionData {
  token?: string;
  role?: string;
  name?: string;
  department?: string;
  departmentId?: string;
  roomNo?: string;
  isLoggedIn: boolean;
}

/**
 * iron-session 설정 옵션
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "anook_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" && process.env.DISABLE_SECURE_COOKIE !== "true",
    httpOnly: true,
    // 세션 안에 담기는 백엔드 JWT의 만료(24시간)와 일치시킨다.
    // 이 값을 생략하면 iron-session이 기본 ttl(14일)로 채워넣어,
    // JWT는 만료됐는데 쿠키는 살아있는 구간(24시간~14일)이 생긴다.
    // 그 구간에서는 로그인 상태로 보이지만 모든 API가 거부되어 화면이 비어 보인다.
    maxAge: 60 * 60 * 24,
  },
};

/**
 * 기본 세션 데이터
 */
export const defaultSession: SessionData = {
  isLoggedIn: false,
};
