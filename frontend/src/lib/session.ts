import { SessionOptions } from "iron-session";

/**
 * 세션에 저장될 데이터의 타입 정의
 */
export interface SessionData {
  token?: string;
  role?: string;
  name?: string;
  department?: string;
  isLoggedIn: boolean;
}

/**
 * iron-session 설정 옵션
 */
export const sessionOptions: SessionOptions = {
  password: "complex_password_at_least_32_characters_long", 
  cookieName: "anook_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

/**
 * 기본 세션 데이터
 */
export const defaultSession: SessionData = {
  isLoggedIn: false,
};
