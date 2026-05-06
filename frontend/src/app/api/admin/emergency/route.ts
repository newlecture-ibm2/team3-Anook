import { NextResponse } from 'next/server';
import { handleResponse } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/emergency`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(res);
  } catch (error) {
    console.error('BFF /api/admin/emergency GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
