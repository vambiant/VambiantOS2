import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSession } from '@vambiant/auth';

export async function POST() {
  const cookieStore = await cookies();
  clearSession(cookieStore);
  return NextResponse.json({ success: true });
}
