import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetLinkToken } from "@/lib/auth/verification-token";
import { sendPasswordResetEmail } from "@/server/services/email.service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const ForgotSchema = z.object({
  email: z.string().trim().email(),
});

function getBaseUrl(request: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `forgot:${ip}`, limit: 6, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const parsed = ForgotSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    const email = parsed.data.email;
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true, fullName: true },
    });

    if (!user?.email) {
      return NextResponse.json({ ok: true });
    }

    const { rawToken } = await issuePasswordResetLinkToken(user.email);
    const resetLink = `${getBaseUrl(request)}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetLink,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "FORGOT_PASSWORD_FAILED" }, { status: 500 });
  }
}
