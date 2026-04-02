import { NextResponse } from "next/server";
import { listActiveCategories } from "@/server/services/product.service";

export async function GET() {
  const data = await listActiveCategories();
  return NextResponse.json({ ok: true, data });
}
