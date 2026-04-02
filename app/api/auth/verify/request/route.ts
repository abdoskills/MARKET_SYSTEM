import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationCode } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/server/services/email.service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const RequestSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `verify-request:${ip}`, limit: 8, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const parsed = RequestSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const email = parsed.data.email;

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { fullName: true, email: true, isActive: true },
    });

    if (!user?.email || user.isActive) {
      return NextResponse.json({ ok: true });
    }

    const { code } = await issueEmailVerificationCode(user.email);
    await sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      code,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "SMTP_NOT_CONFIGURED") {
      return NextResponse.json({ ok: false, error: "EMAIL_NOT_CONFIGURED" }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "VERIFY_REQUEST_FAILED" }, { status: 500 });
  }
}
