import { NextResponse } from "next/server";
import { validatePromoCode } from "@/server/services/promo.service";
import { z } from "zod";

const ValidateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.coerce.number().min(0),
});

export async function POST(request: Request) {
  const parsed = ValidateSchema.safeParse((await request.json()) as unknown);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await validatePromoCode({
    code: parsed.data.code,
    subtotal: parsed.data.subtotal,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}
