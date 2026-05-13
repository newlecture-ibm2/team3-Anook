import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";

/**
 * GET /api/auth/session
 * 현재 세션 정보를 반환합니다.
 */
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ isLoggedIn: false }, { status: 401 });
  }

  return NextResponse.json({
    isLoggedIn: true,
    name: session.name,
    role: session.role,
    department: session.department,
    departmentId: session.departmentId,
    roomNo: session.roomNo
  });
}

/**
 * DELETE /api/auth/session
 * 현재 세션을 파기합니다. (로그아웃 / 체크아웃 세션 만료)
 */
export async function DELETE() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ isLoggedIn: false });
}
