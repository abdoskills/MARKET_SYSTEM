import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/server";
import { captureError } from "@/lib/monitoring/sentry";
import { addAuditEvent } from "@/lib/security/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const ProductIdSchema = z.object({
  id: z.string().trim().min(1),
});

const ProductUpdateSchema = z.object({
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
  isActive: z.boolean().optional(),
});

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(session.role === "ADMIN" || session.role === "MANAGER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const parsedParams = ProductIdSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PRODUCT_ID" }, { status: 400 });
    }

    const parsedBody = ProductUpdateSchema.safeParse((await request.json()) as unknown);
    if (!parsedBody.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsedBody.error.flatten() }, { status: 400 });
    }

    const { id } = parsedParams.data;
    const body = parsedBody.data;

    const before = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        salePrice: true,
      },
    });

    const product = await prisma.product.update({
      where: { id },
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
        isActive: body.isActive ?? true,
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

    if (before && Number(before.salePrice) !== Number(product.salePrice)) {
      addAuditEvent({
        action: "PRICE_CHANGE",
        userId: session.userId,
        entityId: product.id,
        details: {
          oldPrice: Number(before.salePrice),
          newPrice: Number(product.salePrice),
          sku: product.sku,
        },
      });
    }

    return NextResponse.json({ ok: true, data: product });
  } catch (error) {
    captureError(error, { route: "/api/products/[id]", action: "PUT" });
    return NextResponse.json({ ok: false, error: "UPDATE_PRODUCT_FAILED" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!(session.role === "ADMIN" || session.role === "MANAGER")) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const parsedParams = ProductIdSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PRODUCT_ID" }, { status: 400 });
    }
    const { id } = parsedParams.data;
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    captureError(error, { route: "/api/products/[id]", action: "DELETE" });
    return NextResponse.json({ ok: false, error: "DELETE_PRODUCT_FAILED" }, { status: 500 });
  }
}
