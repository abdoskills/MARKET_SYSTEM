import { NextResponse } from "next/server";
import { getOrdersBoard } from "@/server/services/dashboard.service";
import { getServerSession } from "@/lib/auth/server";
import { z } from "zod";

const OrdersQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (!(session.role === "ADMIN" || session.role === "MANAGER" || session.role === "CASHIER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = OrdersQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_QUERY", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = await getOrdersBoard({ q: parsed.data.q });
  return NextResponse.json({ data });
}
