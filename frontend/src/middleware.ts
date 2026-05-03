import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

/**
 * Next.js Middleware
 * 특정 경로에 대한 접근 권한을 서버 사이드에서 사전에 검사합니다.
 */
export async function middleware(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  const { pathname } = request.nextUrl;

  // 1. 이미 로그인한 사용자가 로그인 페이지에 접근할 때
  if (pathname === "/login") {
    if (session.isLoggedIn) {
      // 역할에 따른 리다이렉트
      let redirectUrl = "/staff";
      if (session.role === "ADMIN") redirectUrl = "/admin/dashboard";
      if (session.role === "GUEST") redirectUrl = "/guest/chat";
      
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 2. 보호된 경로 접근 시 로그인 여부 확인
  const isProtectedPath = 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/staff") || 
    pathname.startsWith("/guest"); // ★ /guest 경로 보호 추가

  if (isProtectedPath && !session.isLoggedIn) {
    // 투숙객 경로(/guest)에서 튕길 때는 /login 대신 전용 안내 페이지가 필요할 수 있으나, 우선 /login으로 통일
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. 권한별 세부 통제
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/staff", request.url));
  }
  
  if (pathname.startsWith("/staff") && (session.role !== "STAFF" && session.role !== "ADMIN")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/guest") && session.role !== "GUEST") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/admin/:path*",
    "/staff/:path*",
    "/guest/:path*", // ★ matcher 업데이트
  ],
};
