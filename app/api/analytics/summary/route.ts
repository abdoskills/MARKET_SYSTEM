import { NextResponse } from "next/server";
import { getAnalyticsSummary } from "@/server/services/dashboard.service";
import { getServerSession } from "@/lib/auth/server";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(session.role === "ADMIN" || session.role === "MANAGER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawRange = searchParams.get("range");
  const range = rawRange === "week" || rawRange === "month" ? rawRange : "today";
  const data = await getAnalyticsSummary({ range });
  return NextResponse.json({ data });
}
