import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/server";
import { listProducts } from "@/server/services/product.service";
import { z } from "zod";

const ProductQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

const ProductBodySchema = z.object({
  sku: z.string().trim().min(1).max(100),
  nameAr: z.string().trim().min(1).max(180),
  nameEn: z.string().trim().max(180).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  unit: z.string().trim().min(1).max(30).default("pcs"),
  costPrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  stockQty: z.coerce.number().min(0).default(0),
  lowStockThreshold: z.coerce.number().min(0).default(0),
  categoryId: z.string().trim().max(191).optional().nullable().or(z.literal("")),
});

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(session.role === "ADMIN" || session.role === "MANAGER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = ProductQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_QUERY", details: parsed.error.flatten() }, { status: 400 });
  }

  const products = await listProducts({
    q: parsed.data.q,
    category: parsed.data.category,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    sort: "newest",
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(session.role === "ADMIN" || session.role === "MANAGER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const raw = (await request.json()) as unknown;
    const parsed = ProductBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;

    const product = await prisma.product.create({
      data: {
        sku: body.sku,
        nameAr: body.nameAr,
        nameEn: toNullableString(body.nameEn),
        imageUrl: toNullableString(body.imageUrl),
        unit: body.unit,
        costPrice: body.costPrice,
        salePrice: body.salePrice,
        taxRatePercent: body.taxRatePercent,
        stockQty: body.stockQty,
        lowStockThreshold: body.lowStockThreshold,
        categoryId: toNullableString(body.categoryId),
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        nameAr: true,
        nameEn: true,
        imageUrl: true,
        unit: true,
        salePrice: true,
        taxRatePercent: true,
        stockQty: true,
        lowStockThreshold: true,
      },
    });

    return NextResponse.json({ ok: true, data: product }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "CREATE_PRODUCT_FAILED" }, { status: 500 });
  }
}
