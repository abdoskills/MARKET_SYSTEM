import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type ProductFilterInput = {
  q?: string;
  category?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name_ar";
  page?: number;
  pageSize?: number;
};

export type StorefrontProduct = {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string | null;
  imageUrl: string | null;
  unit: string;
  salePrice: number;
  taxRatePercent: number;
  stockQty: number;
  lowStockThreshold: number;
  category: {
    id: string;
    slug: string;
    nameAr: string;
  } | null;
  primaryBarcode: string | null;
};

type CategoryLite = {
  id: string;
  slug: string;
  nameAr: string;
};

const DEFAULT_PAGE_SIZE = 24;

function isDbUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("Can't reach database server") ||
    error.message.includes("P1001") ||
    error.message.includes("does not exist") ||
    error.message.includes("table")
  );
}

function normalizeNumber(value: number | undefined, fallback: number) {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return value;
}

function mapSortToOrderBy(sort: ProductFilterInput["sort"]): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ salePrice: "asc" }];
    case "price_desc":
      return [{ salePrice: "desc" }];
    case "name_ar":
      return [{ nameAr: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) return 0;
  return Number(value);
}

export async function listProducts(filters: ProductFilterInput = {}) {
  const page = Math.max(1, normalizeNumber(filters.page, 1));
  const pageSize = Math.min(100, Math.max(1, normalizeNumber(filters.pageSize, DEFAULT_PAGE_SIZE)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { nameAr: { contains: q, mode: "insensitive" } },
      { nameEn: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcodes: { some: { code: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (filters.category?.trim()) {
    where.category = {
      slug: filters.category.trim(),
      isActive: true,
    };
  }

  if (filters.inStock) {
    where.stockQty = { gt: 0 };
  }

  const minPrice = normalizeNumber(filters.minPrice, Number.NaN);
  const maxPrice = normalizeNumber(filters.maxPrice, Number.NaN);
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    where.salePrice = {};
    if (!Number.isNaN(minPrice)) where.salePrice.gte = minPrice;
    if (!Number.isNaN(maxPrice)) where.salePrice.lte = maxPrice;
  }

  try {
    const [rows, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: mapSortToOrderBy(filters.sort),
        skip,
        take: pageSize,
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
          category: {
            select: {
              id: true,
              slug: true,
              nameAr: true,
            },
          },
          barcodes: {
            where: { isPrimary: true },
            select: { code: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data: StorefrontProduct[] = rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      imageUrl: row.imageUrl,
      unit: row.unit,
      salePrice: decimalToNumber(row.salePrice),
      taxRatePercent: decimalToNumber(row.taxRatePercent),
      stockQty: decimalToNumber(row.stockQty),
      lowStockThreshold: decimalToNumber(row.lowStockThreshold),
      category: row.category,
      primaryBarcode: row.barcodes[0]?.code ?? null,
    }));

    return {
      data,
      dbAvailable: true,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return {
      data: [],
      dbAvailable: false,
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 1,
      },
    };
  }
}

export async function listActiveCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { nameAr: "asc" }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
      },
    });
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return [];
  }
}

export async function getStorefrontProducts(params?: { q?: string; category?: string }) {
  const result = await listProducts({
    q: params?.q,
    category: params?.category,
    sort: "newest",
    page: 1,
    pageSize: 48,
  });

  return result.data;
}
