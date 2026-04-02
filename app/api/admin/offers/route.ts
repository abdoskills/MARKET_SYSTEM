import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { listPromoCodes, upsertPromoCode } from "@/server/services/promo.service";
import { z } from "zod";

const CreateOfferSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  kind: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().positive(),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const data = await listPromoCodes();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = CreateOfferSchema.safeParse((await request.json()) as unknown);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
  }

  const row = await upsertPromoCode({
    code: parsed.data.code,
    kind: parsed.data.kind,
    value: parsed.data.value,
    expiresAt: parsed.data.expiresAt || null,
    isActive: parsed.data.isActive ?? true,
  });

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}
