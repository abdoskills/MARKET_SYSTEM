import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumePasswordResetToken } from "@/lib/auth/verification-token";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

const ResetSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(8).max(120),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `reset:${ip}`, limit: 8, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const parsed = ResetSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed?.email) {
      return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.user.updateMany({
      where: { email: { equals: consumed.email, mode: "insensitive" } },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "RESET_PASSWORD_FAILED" }, { status: 500 });
  }
}
