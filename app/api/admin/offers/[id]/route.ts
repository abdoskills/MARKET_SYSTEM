import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { setPromoStatus } from "@/server/services/promo.service";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const BodySchema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: "INVALID_ID" }, { status: 400 });
  }

  const parsedBody = BodySchema.safeParse((await request.json()) as unknown);
  if (!parsedBody.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const updated = await setPromoStatus(parsedParams.data.id, parsedBody.data.isActive);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: updated });
}
