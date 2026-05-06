import { NextResponse } from 'next/server';
import { handleResponse } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function POST(request: Request, { params }: { params: { id: string, action: string } }) {
  try {
    const { id, action } = params;
    
    let url = '';
    if (action === 'start') {
      url = `${BACKEND_URL}/admin/emergency/${id}/start`;
    } else if (action === 'call-engineer') {
      url = `${BACKEND_URL}/admin/emergency/${id}/call-engineer`;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(res);
  } catch (error) {
    console.error(`BFF /api/admin/emergency/${params.id}/${params.action} POST Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
