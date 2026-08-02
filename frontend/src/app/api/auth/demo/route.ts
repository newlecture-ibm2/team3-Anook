import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sessionOptions, SessionData } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// 데모 계정 정보는 서버에서만 읽는다. 클라이언트 번들에 PIN/코드가 포함되지 않도록
// 팝업은 역할명("ADMIN" | "GUEST")만 전달한다.
const DEMO_ADMIN_PIN = process.env.DEMO_ADMIN_PIN || "999999";
const DEMO_GUEST_CODE = process.env.DEMO_GUEST_CODE || "test-guest-code-1234";

/**
 * POST /api/auth/demo
 * 포트폴리오 방문자를 위한 원클릭 데모 로그인.
 * 접속 코드를 모르는 방문자가 게스트/관리자 화면을 바로 둘러볼 수 있게 한다.
 */
export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    if (role !== "ADMIN" && role !== "GUEST") {
      return NextResponse.json({ message: "알 수 없는 데모 역할입니다." }, { status: 400 });
    }

    const isAdmin = role === "ADMIN";
    const endpoint = isAdmin ? "/auth/staff" : "/auth/guest";
    const payload = isAdmin
      ? { pin: DEMO_ADMIN_PIN }
      : { accessCode: DEMO_GUEST_CODE };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Demo login failed: role=${role}, status=${response.status}`);
      return NextResponse.json(
        { message: "데모 계정을 준비하지 못했습니다. 잠시 후 다시 시도해주세요." },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 기존 세션이 있어도 save()가 덮어쓰므로 별도 파기가 필요 없다. (역할 전환 지원)
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    session.token = data.token;
    session.role = data.role;
    session.name = data.name;
    session.department = data.department;
    session.departmentId = data.departmentId;
    session.roomNo = data.roomNo;
    session.isLoggedIn = true;
    await session.save();

    // 역할별 목적지는 일반 로그인(useLoginForm)과 동일한 규칙을 따른다.
    const redirectTo =
      data.role === "FRONTDESK" ? "/frontdesk/requests"
      : data.role === "GUEST" ? "/guest/chat"
      : "/staff";

    return NextResponse.json({
      name: data.name,
      role: data.role,
      redirectTo,
    });

  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { message: "서버 연결 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
