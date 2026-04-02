import { getServerSession } from "@/lib/auth/server";
import { listAuditEvents } from "@/lib/security/audit";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 200);

  return NextResponse.json({ ok: true, data: listAuditEvents(limit) });
}
