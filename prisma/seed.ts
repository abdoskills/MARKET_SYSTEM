import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  await prisma.$transaction([
    prisma.offlineSyncEvent.deleteMany(),
    prisma.receipt.deleteMany(),
    prisma.cashMovement.deleteMany(),
    prisma.posSession.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.stockAlert.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.customerAddress.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.productBarcode.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const categories = [
    { slug: "dairy", nameAr: "ألبان وأجبان", sortOrder: 1 },
    { slug: "snacks", nameAr: "سناكس وتسالي", sortOrder: 2 },
    { slug: "beverages", nameAr: "مشروبات", sortOrder: 3 },
    { slug: "bakery", nameAr: "مخبوزات", sortOrder: 4 },
    { slug: "frozen", nameAr: "مجمّدات", sortOrder: 5 },
    { slug: "cleaning", nameAr: "منظفات", sortOrder: 6 },
    { slug: "grocery", nameAr: "بقالة", sortOrder: 7 },
  ];

  for (const category of categories) {
    await prisma.category.create({ data: { ...category, isActive: true } });
  }

  const categoryMap = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  const products = [
    {
      sku: "EG-DY-001",
      barcode: "6223001010011",
      nameAr: "حليب عضوي طازج",
      brand: "مزارع محلية",
      categorySlug: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
      costPrice: 18,
      salePrice: 24.00,
      stockQty: 84,
      lowStockThreshold: 12,
      taxRatePercent: 14,
    },
    {
      sku: "EG-DY-002",
      barcode: "6223001010012",
      nameAr: "جبنة بري حرفية",
      brand: "معتقة",
      categorySlug: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=80",
      costPrice: 60,
      salePrice: 85.00,
      stockQty: 52,
      lowStockThreshold: 10,
      taxRatePercent: 14,
    },
    {
      sku: "EG-DY-003",
      barcode: "6223001010013",
      nameAr: "زبادي يوناني بالعسل",
      brand: "كريمي",
      categorySlug: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
      costPrice: 12,
      salePrice: 18.50,
      stockQty: 46,
      lowStockThreshold: 8,
      taxRatePercent: 14,
    },
    {
      sku: "EG-DY-004",
      barcode: "6223001010014",
      nameAr: "زبدة بلدية طبيعية",
      brand: "Artisanal",
      categorySlug: "dairy",
      imageUrl: "https://images.unsplash.com/photo-1589134732653-e847db18dc20?auto=format&fit=crop&w=900&q=80",
      costPrice: 40,
      salePrice: 65,
      stockQty: 120,
      lowStockThreshold: 20,
      taxRatePercent: 14,
    },
    {
      sku: "EG-SN-001",
      barcode: "6223001010101",
      nameAr: "مقرمشات شوفان بالزعتر",
      brand: "خبز صحي",
      categorySlug: "snacks",
      imageUrl: "https://images.unsplash.com/photo-1601625464197-abfe157f4cb4?auto=format&fit=crop&w=900&q=80",
      costPrice: 17,
      salePrice: 23,
      stockQty: 66,
      lowStockThreshold: 12,
      taxRatePercent: 14,
    },
    {
      sku: "EG-SN-002",
      barcode: "6223001010102",
      nameAr: "لوز محمص بالعسل",
      brand: "Nuts Mix",
      categorySlug: "snacks",
      imageUrl: "https://images.unsplash.com/photo-1629824647318-aecc6b84a9e2?auto=format&fit=crop&w=900&q=80",
      costPrice: 30,
      salePrice: 45,
      stockQty: 88,
      lowStockThreshold: 15,
      taxRatePercent: 14,
    },
    {
      sku: "EG-BV-001",
      barcode: "6223001010201",
      nameAr: "عصير برتقال طبيعي",
      brand: "Fresh",
      categorySlug: "beverages",
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80",
      costPrice: 15,
      salePrice: 22,
      stockQty: 75,
      lowStockThreshold: 10,
      taxRatePercent: 14,
    },
    {
      sku: "EG-BV-002",
      barcode: "6223001010202",
      nameAr: "مياه معدنية نقية",
      brand: "Pure",
      categorySlug: "beverages",
      imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=900&q=80",
      costPrice: 4,
      salePrice: 8,
      stockQty: 73,
      lowStockThreshold: 10,
      taxRatePercent: 14,
    },
    {
      sku: "EG-BK-001",
      barcode: "6223001010301",
      nameAr: "خبز ساوردو أرتيزان",
      brand: "Sourdough",
      categorySlug: "bakery",
      imageUrl: "https://images.unsplash.com/photo-1585478259715-876a6a81fa08?auto=format&fit=crop&w=900&q=80",
      costPrice: 25,
      salePrice: 35,
      stockQty: 38,
      lowStockThreshold: 6,
      taxRatePercent: 14,
    },
    {
      sku: "EG-BK-002",
      barcode: "6223001010302",
      nameAr: "كرواسون زبدة فرنسي",
      brand: "Fresh Bake",
      categorySlug: "bakery",
      imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=80",
      costPrice: 15,
      salePrice: 22,
      stockQty: 64,
      lowStockThreshold: 10,
      taxRatePercent: 14,
    },
    {
      sku: "EG-FR-001",
      barcode: "6223001010401",
      nameAr: "آيس كريم فانيليا طبيعي",
      brand: "Artisan Gelato",
      categorySlug: "frozen",
      imageUrl: "https://images.unsplash.com/photo-1570197781417-0a823758066f?auto=format&fit=crop&w=900&q=80",
      costPrice: 35,
      salePrice: 50,
      stockQty: 27,
      lowStockThreshold: 8,
      taxRatePercent: 14,
    },
    {
      sku: "EG-CL-001",
      barcode: "6223001010501",
      nameAr: "صابون زيت زيتون عضوي",
      brand: "Nature",
      categorySlug: "cleaning",
      imageUrl: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?auto=format&fit=crop&w=900&q=80",
      costPrice: 20,
      salePrice: 30,
      stockQty: 19,
      lowStockThreshold: 5,
      taxRatePercent: 14,
    },
    {
      sku: "EG-GR-001",
      barcode: "6223001010601",
      nameAr: "عسل نحل جبلي",
      brand: "Organic Honey",
      categorySlug: "grocery",
      imageUrl: "https://images.unsplash.com/photo-1587049352847-4d4b1ee7190d?auto=format&fit=crop&w=900&q=80",
      costPrice: 80,
      salePrice: 120,
      stockQty: 58,
      lowStockThreshold: 10,
      taxRatePercent: 0,
    },
    {
      sku: "EG-GR-002",
      barcode: "6223001010602",
      nameAr: "زيت زيتون بكر ممتاز",
      brand: "Extra Virgin",
      categorySlug: "grocery",
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
      costPrice: 90,
      salePrice: 140,
      stockQty: 90,
      lowStockThreshold: 16,
      taxRatePercent: 0,
    }
  ];

  for (const p of products) {
    const saved = await prisma.product.create({
      data: {
        sku: p.sku,
        nameAr: p.nameAr,
        brand: p.brand,
        imageUrl: p.imageUrl,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        unit: "pcs",
        stockQty: p.stockQty,
        lowStockThreshold: p.lowStockThreshold,
        taxRatePercent: p.taxRatePercent,
        isActive: true,
        categoryId: categoryMap.get(p.categorySlug),
      },
    });

    await prisma.productBarcode.create({
      data: {
        productId: saved.id,
        code: p.barcode,
        isPrimary: true,
      },
    });
  }

  const [adminUser, managerUser, cashierUser] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "Admin Demo",
        email: "admin@pristine.demo",
        phone: "01000000001",
        role: "ADMIN",
        passwordHash: hashPassword("Admin@123"),
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        fullName: "Store Manager Demo",
        email: "manager@pristine.demo",
        phone: "01000000002",
        role: "MANAGER",
        passwordHash: hashPassword("Manager@123"),
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        fullName: "Cashier Demo",
        email: "cashier@pristine.demo",
        phone: "01000000003",
        role: "CASHIER",
        passwordHash: hashPassword("Cashier@123"),
        isActive: true,
      },
    }),
  ]);

  const seededProducts = await prisma.product.findMany({
    select: { id: true, sku: true, salePrice: true, costPrice: true, taxRatePercent: true, nameAr: true },
  });
  const bySku = new Map(seededProducts.map((p) => [p.sku, p]));

  const customers = await Promise.all([
    prisma.customer.create({ data: { fullName: "محمد خالد", phone: "01055001122" } }),
    prisma.customer.create({ data: { fullName: "سارة أحمد", phone: "01133445566" } }),
    prisma.customer.create({ data: { fullName: "أحمد علي", phone: "01277889900" } }),
    prisma.customer.create({ data: { fullName: "منى حسن", phone: "01077884422" } }),
  ]);

  const now = new Date();
  const ordersSeed = [
    {
      orderNumber: "INV-2026-0401-1001",
      channel: "ONLINE" as const,
      status: "COMPLETED" as const,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      customerId: customers[0].id,
      paymentMethod: "CARD" as const,
      items: [
        { sku: "EG-DY-001", quantity: 2 },
        { sku: "EG-SN-001", quantity: 1 },
        { sku: "EG-BV-001", quantity: 1 },
      ],
    },
    {
      orderNumber: "INV-2026-0401-1002",
      channel: "POS" as const,
      status: "COMPLETED" as const,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      customerId: null,
      paymentMethod: "CASH" as const,
      items: [
        { sku: "EG-SN-001", quantity: 2 },
        { sku: "EG-BV-001", quantity: 1 },
        { sku: "EG-BK-001", quantity: 1 },
      ],
    },
    {
      orderNumber: "INV-2026-0331-1003",
      channel: "ONLINE" as const,
      status: "COMPLETED" as const,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      customerId: customers[1].id,
      paymentMethod: "CARD" as const,
      items: [
        { sku: "EG-GR-001", quantity: 2 },
        { sku: "EG-GR-002", quantity: 1 },
        { sku: "EG-CL-001", quantity: 1 },
      ],
    },
    {
      orderNumber: "INV-2026-0330-1004",
      channel: "POS" as const,
      status: "COMPLETED" as const,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      customerId: null,
      paymentMethod: "CASH" as const,
      items: [
        { sku: "EG-DY-003", quantity: 1 },
        { sku: "EG-BV-002", quantity: 2 },
        { sku: "EG-SN-002", quantity: 3 },
      ],
    },
    {
      orderNumber: "INV-2026-0329-1005",
      channel: "ONLINE" as const,
      status: "COMPLETED" as const,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      customerId: customers[2].id,
      paymentMethod: "CARD" as const,
      items: [
        { sku: "EG-SN-001", quantity: 3 },
        { sku: "EG-DY-001", quantity: 1 },
        { sku: "EG-GR-002", quantity: 2 },
      ],
    },
  ];

  const posOrderIds: string[] = [];

  for (const seededOrder of ordersSeed) {
    const lines = seededOrder.items.map((entry) => {
      const product = bySku.get(entry.sku);
      if (!product) throw new Error(`Missing seeded product: ${entry.sku}`);

      const unitPrice = Number(product.salePrice);
      const taxRate = Number(product.taxRatePercent);
      const costAtSale = Number(product.costPrice);
      const lineSubtotal = round3(unitPrice * entry.quantity);
      const taxAmount = round3(lineSubtotal * (taxRate / 100));
      const lineTotal = round3(lineSubtotal + taxAmount);

      return {
        productId: product.id,
        quantity: entry.quantity,
        unitPrice,
        taxAmount,
        lineTotal,
        costAtSale,
      };
    });

    const subtotal = round3(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
    const taxAmount = round3(lines.reduce((sum, line) => sum + line.taxAmount, 0));
    const discountAmount = seededOrder.orderNumber.endsWith("1005") ? round3(subtotal * 0.05) : 0;
    const totalAmount = round3(subtotal + taxAmount - discountAmount);

    const createdOrder = await prisma.order.create({
      data: {
        orderNumber: seededOrder.orderNumber,
        channel: seededOrder.channel,
        status: seededOrder.status,
        customerId: seededOrder.customerId,
        createdByUserId: seededOrder.channel === "POS" ? cashierUser.id : managerUser.id,
        notes: seededOrder.channel === "ONLINE" ? "DELIVERY_ADDRESS: القاهرة - مدينة نصر" : null,
        subtotal,
        discountType: discountAmount > 0 ? "FIXED" : null,
        discountValue: discountAmount > 0 ? discountAmount : null,
        discountAmount,
        taxAmount,
        shippingFee: 0,
        totalAmount,
        paymentMethod: seededOrder.paymentMethod,
        paymentStatus: "PAID",
        paidAmount: totalAmount,
        changeAmount: 0,
        completedAt: new Date(seededOrder.createdAt.getTime() + 20 * 60 * 1000),
        createdAt: seededOrder.createdAt,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            costAtSale: line.costAtSale,
            taxAmount: line.taxAmount,
            discountAmount: 0,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    await prisma.receipt.create({
      data: {
        orderId: createdOrder.id,
        receiptNumber: `RCPT-${seededOrder.orderNumber.split("-").slice(-1)[0]}`,
        printableHtml: `<html><body><h1>إيصال ${seededOrder.orderNumber}</h1><p>المبلغ: ${totalAmount.toFixed(2)} ج.م</p></body></html>`,
      },
    });

    if (seededOrder.channel === "POS") {
      posOrderIds.push(createdOrder.id);
    }
  }

  const posSessions = [
    {
      sessionNumber: "POS-SESSION-2026-0401-01",
      openedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      openingFloat: 1500,
      closingAmount: 1980,
      expectedAmount: 1968,
      differenceAmount: 12,
      orderId: posOrderIds[0] ?? null,
    },
    {
      sessionNumber: "POS-SESSION-2026-0331-01",
      openedAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      openingFloat: 1300,
      closingAmount: 1725,
      expectedAmount: 1715,
      differenceAmount: 10,
      orderId: posOrderIds[1] ?? null,
    },
    {
      sessionNumber: "POS-SESSION-2026-0329-01",
      openedAt: new Date(now.getTime() - 80 * 60 * 60 * 1000),
      closedAt: new Date(now.getTime() - 75 * 60 * 60 * 1000),
      openingFloat: 1200,
      closingAmount: 1410,
      expectedAmount: 1408,
      differenceAmount: 2,
      orderId: null,
    },
  ];

  for (const session of posSessions) {
    const savedSession = await prisma.posSession.create({
      data: {
        sessionNumber: session.sessionNumber,
        openedByUserId: cashierUser.id,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openingFloat: session.openingFloat,
        closingAmount: session.closingAmount,
        expectedAmount: session.expectedAmount,
        differenceAmount: session.differenceAmount,
        orderId: session.orderId,
      },
    });

    await prisma.cashMovement.createMany({
      data: [
        {
          sessionId: savedSession.id,
          userId: cashierUser.id,
          type: "OPENING_FLOAT",
          amount: session.openingFloat,
          note: "رصيد افتتاح الوردية",
          createdAt: session.openedAt,
        },
        {
          sessionId: savedSession.id,
          userId: cashierUser.id,
          type: "CLOSING",
          amount: session.closingAmount,
          note: "إغلاق الوردية",
          createdAt: session.closedAt ?? session.openedAt,
        },
      ],
    });
  }

  console.log("✅ Showroom seed completed: 24 products, 5 orders, 3 POS sessions.");
  console.log(`👤 Admin: ${adminUser.email} / Admin@123`);
  console.log(`👤 Manager: ${managerUser.email} / Manager@123`);
  console.log(`👤 Cashier: ${cashierUser.email} / Cashier@123`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
