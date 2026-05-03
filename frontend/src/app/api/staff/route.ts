import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export const dynamic = 'force-dynamic';

/**
 * BFF Proxy for Staff Domain
 * staff 도메인 전용 API 핸들러입니다.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.isLoggedIn || !session.token) {
      return NextResponse.json({ message: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const departmentId = searchParams.get("departmentId");

    if (action === "requests") {
      let role = session.role;
      if (!role && session.token) {
        try {
          const payloadBase64 = session.token.split('.')[1];
          const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
          role = JSON.parse(decodedJson).role;
        } catch (e) {
          console.error("Token decode error:", e);
        }
      }

      const backendEndpoint = role === "ADMIN"
        ? (departmentId ? `${BACKEND_URL}/admin/requests?dept=${departmentId}` : `${BACKEND_URL}/admin/requests`)
        : (departmentId ? `${BACKEND_URL}/staff/requests?departmentId=${departmentId}` : `${BACKEND_URL}/staff/requests`);

      const response = await fetch(backendEndpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        session.destroy();
        return NextResponse.json(
          { message: "세션이 만료되었거나 권한이 없습니다. 다시 로그인해주세요." },
          { status: 401 }
        );
      }

      if (!response.ok) {
        return NextResponse.json(
          { message: "백엔드 서버에서 데이터를 가져오지 못했습니다." },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      if (role === "ADMIN") {
        const mappedData = data.map((item: any) => ({
          id: item.id,
          status: item.status,
          priority: item.priority,
          departmentId: item.departmentId,
          summary: item.summary,
          rawText: "관리자 뷰에서는 상세 텍스트가 제공되지 않습니다.",
          roomNumber: item.roomNo,
          assignedStaffName: item.assignedStaffName,
          confidence: null,
          createdAt: item.createdAt,
        }));
        return NextResponse.json(mappedData);
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });

  } catch (error) {
    console.error("Staff API error:", error);
    return NextResponse.json(
      { message: "서버 내부 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

