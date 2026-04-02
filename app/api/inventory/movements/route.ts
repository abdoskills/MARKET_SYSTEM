import { NextResponse } from "next/server";
import { getInventorySnapshot } from "@/server/services/dashboard.service";

export async function GET() {
  const data = await getInventorySnapshot();
  return NextResponse.json({ data });
}
