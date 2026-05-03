import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/auth/staff
 * 직원/관리자 로그인을 처리하고 세션 쿠키를 생성합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    const response = await fetch(`${BACKEND_URL}/auth/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || "로그인에 실패했습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    session.token = data.token;
    session.role = data.role;
    session.name = data.name;
    session.department = data.department;
    session.isLoggedIn = true;

    await session.save();

    return NextResponse.json({
      name: data.name,
      role: data.role,
      department: data.department
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "서버 연결 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
