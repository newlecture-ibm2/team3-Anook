import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

/**
 * POST /api/auth/guest
 * 투숙객(QR 랜덤코드) 로그인을 처리하고 세션 쿠키를 생성합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessCode } = body;

    const response = await fetch(`${BACKEND_URL}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "유효하지 않은 QR 코드이거나 세션이 만료되었습니다." },
        { status: response.status }
      );
    }

    const data = await response.json();

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    session.token = data.token;
    session.role = data.role;
    session.name = data.name;
    session.roomNo = data.roomNo;
    session.isLoggedIn = true;

    await session.save();

    return NextResponse.json({
      name: data.name,
      role: data.role,
      roomNo: data.roomNo
    });

  } catch (error) {
    console.error("Guest login error:", error);
    return NextResponse.json(
      { message: "서버 연결 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
