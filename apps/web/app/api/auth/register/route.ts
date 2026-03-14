import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, schema, eq } from '@vambiant/db';
import { hashPassword, setSession } from '@vambiant/auth';

function generateUlid(): string {
  // Simple ULID-like generator (26 chars, alphanumeric uppercase)
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const now = Date.now();
  let timeStr = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    timeStr = chars[t % 32] + timeStr;
    t = Math.floor(t / 32);
  }
  let randomStr = '';
  for (let i = 0; i < 16; i++) {
    randomStr += chars[Math.floor(Math.random() * 32)];
  }
  return timeStr + randomStr;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: 'Alle Felder sind erforderlich.' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Passwort muss mindestens 8 Zeichen lang sein.' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { message: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits.' },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(schema.users)
      .values({
        ulid: generateUlid(),
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        currentCompanyId: schema.users.currentCompanyId,
      });

    if (!user) {
      return NextResponse.json(
        { message: 'Benutzer konnte nicht erstellt werden.' },
        { status: 500 },
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    await setSession(cookieStore, {
      userId: user.id,
      email: user.email,
      companyId: user.currentCompanyId ?? undefined,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        currentCompanyId: user.currentCompanyId,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'Interner Serverfehler.' },
      { status: 500 },
    );
  }
}
