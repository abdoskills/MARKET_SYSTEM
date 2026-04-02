import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailCode } from "@/lib/auth/verification-token";
import { checkRateLimit } from "@/lib/security/rate-limit";

const VerifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `verify:${ip}`, limit: 12, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const parsed = VerifySchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
    }

    const success = await verifyEmailCode(parsed.data.email, parsed.data.code);
    if (!success) {
      return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED_CODE" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 500 });
  }
}
