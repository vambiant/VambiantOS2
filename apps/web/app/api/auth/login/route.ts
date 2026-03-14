import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, schema, eq } from '@vambiant/db';
import { verifyPassword, setSession } from '@vambiant/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'E-Mail und Passwort sind erforderlich.' },
        { status: 400 },
      );
    }

    // Find user by email
    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        passwordHash: schema.users.passwordHash,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        currentCompanyId: schema.users.currentCompanyId,
        deletedAt: schema.users.deletedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { message: 'Ungültige Anmeldedaten.' },
        { status: 401 },
      );
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { message: 'Dieses Konto wurde deaktiviert.' },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Ungültige Anmeldedaten.' },
        { status: 401 },
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
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Interner Serverfehler.' },
      { status: 500 },
    );
  }
}
