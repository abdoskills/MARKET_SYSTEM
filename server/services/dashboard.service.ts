import { prisma } from "@/lib/prisma";

function isDbUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("Can't reach database server") || error.message.includes("P1001");
}

export async function getInventorySnapshot() {
  try {
    const [totalProducts, stockRows, rows] = await prisma.$transaction([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { stockQty: true, lowStockThreshold: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          sku: true,
          nameAr: true,
          salePrice: true,
          stockQty: true,
          lowStockThreshold: true,
          category: { select: { nameAr: true } },
        },
      }),
    ]);

    const stockMetrics = stockRows.reduce(
      (acc: { low: number; out: number }, row: { stockQty: { toNumber: () => number }; lowStockThreshold: { toNumber: () => number } }) => {
        const qty = row.stockQty.toNumber();
        const threshold = row.lowStockThreshold.toNumber();
        if (qty <= threshold) acc.low += 1;
        if (qty <= 0) acc.out += 1;
        return acc;
      },
      { low: 0, out: 0 },
    );

    return {
      stats: { totalProducts, lowStockProducts: stockMetrics.low, outOfStockProducts: stockMetrics.out },
      rows: rows.map((row: {
        id: string;
        sku: string;
        nameAr: string;
        salePrice: { toNumber: () => number };
        stockQty: { toNumber: () => number };
        lowStockThreshold: { toNumber: () => number };
        category: { nameAr: string } | null;
      }) => ({
        id: row.id,
        sku: row.sku,
        nameAr: row.nameAr,
        salePrice: Number(row.salePrice),
        stockQty: Number(row.stockQty),
        lowStockThreshold: Number(row.lowStockThreshold),
        categoryName: row.category?.nameAr ?? "غير مصنف",
      })),
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return {
      stats: { totalProducts: 0, lowStockProducts: 0, outOfStockProducts: 0 },
      rows: [],
    };
  }
}

export async function getOrdersBoard(params?: { q?: string }) {
  try {
    const query = params?.q?.trim();

    const orders = await prisma.order.findMany({
      where: query
        ? {
            OR: [
              { orderNumber: { contains: query, mode: "insensitive" } },
              { customer: { fullName: { contains: query, mode: "insensitive" } } },
              { customer: { phone: { contains: query, mode: "insensitive" } } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        orderNumber: true,
        channel: true,
        status: true,
        notes: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { fullName: true, phone: true } },
        address: {
          select: {
            city: true,
            district: true,
            street: true,
          },
        },
      },
    });

    const mapped = orders.map((order: {
      id: string;
      orderNumber: string;
      channel: "ONLINE" | "POS";
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "REFUNDED";
      notes: string | null;
      totalAmount: { toNumber: () => number };
      createdAt: Date;
      customer: { fullName: string; phone: string | null } | null;
      address: { city: string; district: string | null; street: string | null } | null;
    }) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      channel: order.channel,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      customerName: order.customer?.fullName ?? "زائر نقدي",
      customerPhone: order.customer?.phone ?? null,
      addressLine: order.address
        ? [order.address.city, order.address.district, order.address.street].filter(Boolean).join(" - ")
        : order.notes?.startsWith("DELIVERY_ADDRESS:")
          ? order.notes.replace("DELIVERY_ADDRESS:", "").trim()
          : null,
    }));

    return {
      pending: mapped.filter((o: { status: string }) => o.status === "PENDING"),
      inProgress: mapped.filter((o: { status: string }) => o.status === "IN_PROGRESS"),
      completed: mapped.filter((o: { status: string }) => o.status === "COMPLETED"),
      canceled: mapped.filter((o: { status: string }) => o.status === "CANCELED"),
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return { pending: [], inProgress: [], completed: [], canceled: [] };
  }
}

export async function getAnalyticsSummary(params?: { range?: "today" | "week" | "month" }) {
  try {
    const now = new Date();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const range = params?.range ?? "today";

    const periodStart = new Date(startOfToday);
    if (range === "week") {
      periodStart.setDate(periodStart.getDate() - 6);
    }
    if (range === "month") {
      periodStart.setDate(1);
    }

    const periodMs = now.getTime() - periodStart.getTime();
    const previousPeriodStart = new Date(periodStart.getTime() - periodMs);
    const previousPeriodEnd = new Date(periodStart);

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [periodOrders, previousPeriodOrders, monthOrders, bestSelling, paymentBreakdown] = await prisma.$transaction([
      prisma.order.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: periodStart, lte: now },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfMonth },
        },
        select: { totalAmount: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["paymentMethod"],
        where: {
          status: "COMPLETED",
          createdAt: { gte: startOfToday },
        },
        _sum: {
          paidAmount: true,
          totalAmount: true,
        },
          orderBy: { _sum: { totalAmount: "desc" } }
      }),
    ]);

    const bestSellingIds = bestSelling.map((row) => row.productId);
    const bestSellingQtyById = new Map(bestSelling.map((row) => [row.productId, Number(row._sum?.quantity ?? 0)]));

    const lowStockTopSellingRows =
      bestSellingIds.length === 0
        ? []
        : await prisma.product.findMany({
            where: {
              id: { in: bestSellingIds },
              isActive: true,
            },
            select: {
              id: true,
              nameAr: true,
              stockQty: true,
              lowStockThreshold: true,
            },
          });

    const turnoverAlerts: Array<{
      productId: string;
      nameAr: string;
      stockQty: number;
      lowStockThreshold: number;
      soldQty: number;
      message: string;
    }> = lowStockTopSellingRows
      .filter(
        (row: { id: string; nameAr: string; stockQty: { toNumber: () => number }; lowStockThreshold: { toNumber: () => number } }) =>
          Number(row.stockQty) <= Number(row.lowStockThreshold),
      )
      .map((row: { id: string; nameAr: string; stockQty: { toNumber: () => number }; lowStockThreshold: { toNumber: () => number } }) => ({
        productId: row.id,
        nameAr: row.nameAr,
        stockQty: Number(row.stockQty),
        lowStockThreshold: Number(row.lowStockThreshold),
        soldQty: bestSellingQtyById.get(row.id) ?? 0,
        message: `المنتج ${row.nameAr} منخفض بالمخزون مقارنة بسرعة البيع`,
      }))
      .sort((a: { soldQty: number }, b: { soldQty: number }) => b.soldQty - a.soldQty);

    const productIds = bestSelling.map((b) => b.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, nameAr: true } });
    const names = new Map(products.map((p) => [p.id, p.nameAr]));

    const dailySales = periodOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const yesterdaySales = previousPeriodOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const revenueDelta = dailySales - yesterdaySales;

    const cashTotal = paymentBreakdown
      .filter((row) => row.paymentMethod === "CASH")
      .reduce((sum, row) => sum + Number(row._sum?.paidAmount ?? row._sum?.totalAmount ?? 0), 0);

    const cardTotal = paymentBreakdown
      .filter((row) => row.paymentMethod === "CARD")
      .reduce((sum, row) => sum + Number(row._sum?.paidAmount ?? row._sum?.totalAmount ?? 0), 0);

    const totalTransactions = periodOrders.length;
    const avgTicket = totalTransactions > 0 ? dailySales / totalTransactions : 0;
    const totalCollected = cashTotal + cardTotal;
    const cashSharePercent = totalCollected > 0 ? (cashTotal / totalCollected) * 100 : 0;

    let salesMovement: Array<{ label: string; sales: number }> = [];
    if (range === "today") {
      const bucket = new Map<number, number>();
      for (const order of periodOrders) {
        const hour = new Date(order.createdAt).getHours();
        bucket.set(hour, (bucket.get(hour) ?? 0) + Number(order.totalAmount));
      }
      salesMovement = Array.from({ length: 24 }, (_, hour) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        sales: Number((bucket.get(hour) ?? 0).toFixed(2)),
      })).filter((item) => item.sales > 0);
    } else {
      const bucket = new Map<string, number>();
      for (const order of periodOrders) {
        const keyDate = new Date(order.createdAt);
        const key = keyDate.toISOString().slice(0, 10);
        bucket.set(key, (bucket.get(key) ?? 0) + Number(order.totalAmount));
      }
      salesMovement = Array.from(bucket.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, sales]) => {
          const d = new Date(`${dateKey}T00:00:00.000Z`);
          return {
            label: d.toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
            sales: Number(sales.toFixed(2)),
          };
        });
    }

    return {
      range,
      dailySales,
      yesterdaySales,
      revenueDelta,
      monthlySales: monthOrders.reduce((sum: number, o: { totalAmount: { toNumber: () => number } }) => sum + Number(o.totalAmount), 0),
      totalTransactions,
      avgTicket,
      salesMovement,
      safeReport: {
        cashTotal,
        cardTotal,
        totalCollected,
        cashSharePercent,
      },
      turnoverAlerts,
      bestSelling: bestSelling.map((b) => {
        return {
          productId: b.productId,
          nameAr: names.get(b.productId) ?? "منتج",
          quantity: Number(b._sum?.quantity ?? 0),
          revenue: Number(b._sum?.lineTotal ?? 0),
        };
      }),
    };
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return {
      range: params?.range ?? "today",
      dailySales: 0,
      yesterdaySales: 0,
      revenueDelta: 0,
      monthlySales: 0,
      totalTransactions: 0,
      avgTicket: 0,
      salesMovement: [],
      safeReport: {
        cashTotal: 0,
        cardTotal: 0,
        totalCollected: 0,
        cashSharePercent: 0,
      },
      turnoverAlerts: [],
      bestSelling: [],
    };
  }
}

export async function getUsersList() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, role: true, isActive: true, email: true, phone: true },
    });

    return users;
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    return [];
  }
}
