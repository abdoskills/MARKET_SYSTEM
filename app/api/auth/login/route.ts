import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { getAuthCookieName, normalizeRole, signSessionToken } from "@/lib/auth/session";
import { captureError } from "@/lib/monitoring/sentry";
import { addAuditEvent } from "@/lib/security/audit";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";

function isEmailIdentifier(value: string) {
  return value.includes("@");
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `login:${ip}`, limit: 10, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
      role?: string;
    };

    const identifier = body.identifier?.trim();
    const password = body.password ?? "";

    if (!identifier || !password) {
      return NextResponse.json({ ok: false, error: "CREDENTIALS_REQUIRED" }, { status: 400 });
    }

    let role = normalizeRole(body.role);

    const user = await prisma.user.findFirst({
      where: isEmailIdentifier(identifier)
        ? { email: { equals: identifier.toLowerCase(), mode: "insensitive" } }
        : { phone: { equals: identifier } },
      select: {
        id: true,
        role: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true,
        loginAttempts: true,
        lockUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (!user.isActive) {
      if (!user.emailVerified) {
        return NextResponse.json({ ok: false, error: "ACCOUNT_NOT_VERIFIED" }, { status: 403 });
      }

      return NextResponse.json({ ok: false, error: "ACCOUNT_DISABLED" }, { status: 403 });
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          error: "ACCOUNT_LOCKED",
          lockUntil: user.lockUntil.toISOString(),
        },
        { status: 423 },
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      const nextAttempts = user.loginAttempts + 1;
      const shouldLock = nextAttempts >= 5;

      await prisma.user.update({
        where: { id: user.id },
        data: shouldLock
          ? {
              loginAttempts: 0,
              lockUntil: new Date(Date.now() + 30 * 60 * 1000),
            }
          : {
              loginAttempts: nextAttempts,
            },
      });

      return NextResponse.json({ ok: false, error: shouldLock ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS" }, { status: shouldLock ? 423 : 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    const userId = user.id;
    role = normalizeRole(user.role);

    addAuditEvent({
      action: "LOGIN",
      userId,
      details: {
        role,
        via: "credentials",
      },
    });

    const token = await signSessionToken({ userId, role });

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(getAuthCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });

    return response;
  } catch (error) {
    captureError(error, { route: "/api/auth/login" });
    return NextResponse.json({ ok: false, error: "LOGIN_FAILED" }, { status: 500 });
  }
}
