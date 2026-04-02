/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes, scryptSync } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(array) {
  return array[randomInt(0, array.length - 1)];
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

async function main() {
  const categories = [
    { slug: "dairy", nameAr: "ألبان وأجبان", sortOrder: 1 },
    { slug: "drinks", nameAr: "مشروبات", sortOrder: 2 },
    { slug: "snacks", nameAr: "سناكس وتسالي", sortOrder: 3 },
    { slug: "cleaners", nameAr: "منظفات", sortOrder: 4 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { nameAr: category.nameAr, isActive: true, sortOrder: category.sortOrder },
      create: { ...category, isActive: true },
    });
  }

  const dairy = await prisma.category.findUnique({ where: { slug: "dairy" } });
  const drinks = await prisma.category.findUnique({ where: { slug: "drinks" } });
  const snacks = await prisma.category.findUnique({ where: { slug: "snacks" } });
  const cleaners = await prisma.category.findUnique({ where: { slug: "cleaners" } });

  const products = [
    {
      sku: "MLK-1L-001",
      nameAr: "حليب كامل الدسم 1 لتر",
      salePrice: 34.5,
      costPrice: 29,
      unit: "pcs",
      stockQty: 42,
      lowStockThreshold: 8,
      taxRatePercent: 14,
      categoryId: dairy.id,
      barcode: "6221001200010",
    },
    {
      sku: "CHS-500-001",
      nameAr: "جبنة بيضاء 500 جم",
      salePrice: 58,
      costPrice: 48,
      unit: "pcs",
      stockQty: 26,
      lowStockThreshold: 6,
      taxRatePercent: 14,
      categoryId: dairy.id,
      barcode: "6221001200011",
    },
    {
      sku: "DRK-JU-001",
      nameAr: "عصير برتقال 1 لتر",
      salePrice: 39,
      costPrice: 31,
      unit: "pcs",
      stockQty: 33,
      lowStockThreshold: 5,
      taxRatePercent: 14,
      categoryId: drinks.id,
      barcode: "6221001200012",
    },
    {
      sku: "SNK-CR-001",
      nameAr: "كراكرز مملح",
      salePrice: 12,
      costPrice: 8,
      unit: "pcs",
      stockQty: 54,
      lowStockThreshold: 10,
      taxRatePercent: 14,
      categoryId: snacks.id,
      barcode: "6221001200013",
    },
    {
      sku: "CLN-LQ-001",
      nameAr: "سائل تنظيف 1 لتر",
      salePrice: 72,
      costPrice: 59,
      unit: "pcs",
      stockQty: 18,
      lowStockThreshold: 4,
      taxRatePercent: 14,
      categoryId: cleaners.id,
      barcode: "6221001200014",
    },
  ];

  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        nameAr: product.nameAr,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        unit: product.unit,
        stockQty: product.stockQty,
        lowStockThreshold: product.lowStockThreshold,
        taxRatePercent: product.taxRatePercent,
        isActive: true,
        categoryId: product.categoryId,
      },
      create: {
        sku: product.sku,
        nameAr: product.nameAr,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        unit: product.unit,
        stockQty: product.stockQty,
        lowStockThreshold: product.lowStockThreshold,
        taxRatePercent: product.taxRatePercent,
        isActive: true,
        categoryId: product.categoryId,
      },
    });

    await prisma.productBarcode.upsert({
      where: { code: product.barcode },
      update: { productId: saved.id, isPrimary: true },
      create: { code: product.barcode, productId: saved.id, isPrimary: true },
    });
  }

  const users = [
    {
      fullName: "System Admin",
      email: "admin@pristine.local",
      phone: "01000000001",
      role: "ADMIN",
      password: "Admin@123",
    },
    {
      fullName: "Store Manager",
      email: "manager@pristine.local",
      phone: "01000000002",
      role: "MANAGER",
      password: "Manager@123",
    },
    {
      fullName: "Main Cashier",
      email: "cashier@pristine.local",
      phone: "01000000003",
      role: "CASHIER",
      password: "Cashier@123",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        isActive: true,
        passwordHash: hashPassword(user.password),
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: true,
        passwordHash: hashPassword(user.password),
      },
    });
  }

  const productsForOrders = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      salePrice: true,
      costPrice: true,
      taxRatePercent: true,
      nameAr: true,
    },
  });

  if (productsForOrders.length > 0) {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const existingRecent = await prisma.order.count({
      where: {
        createdAt: { gte: monthAgo },
      },
    });

    const targetRecentOrders = 120;
    const toCreate = Math.max(0, targetRecentOrders - existingRecent);

    for (let i = 0; i < toCreate; i += 1) {
      const dayOffset = randomInt(0, 29);
      const minuteOffset = randomInt(0, 24 * 60 - 1);
      const createdAt = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000 - minuteOffset * 60 * 1000);

      const channel = Math.random() < 0.7 ? "ONLINE" : "POS";
      const statusRoll = Math.random();
      let status = "COMPLETED";
      if (statusRoll < 0.18) status = "PENDING";
      else if (statusRoll < 0.34) status = "IN_PROGRESS";
      else if (statusRoll < 0.94) status = "COMPLETED";
      else status = "CANCELED";

      const paymentMethod = Math.random() < 0.55 ? "CARD" : "CASH";
      const itemsCount = randomInt(1, 4);

      const selectedProducts = [];
      for (let x = 0; x < itemsCount; x += 1) {
        selectedProducts.push(pickRandom(productsForOrders));
      }

      const lines = selectedProducts.map((product) => {
        const quantity = randomInt(1, 3);
        const unitPrice = Number(product.salePrice);
        const costAtSale = Number(product.costPrice);
        const taxRatePercent = Number(product.taxRatePercent);
        const lineSubtotal = round3(unitPrice * quantity);
        const taxAmount = round3(lineSubtotal * (taxRatePercent / 100));
        const lineTotal = round3(lineSubtotal + taxAmount);

        return {
          productId: product.id,
          quantity,
          unitPrice,
          costAtSale,
          taxAmount,
          lineTotal,
        };
      });

      const subtotal = round3(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
      const taxAmount = round3(lines.reduce((sum, line) => sum + line.taxAmount, 0));
      const discountAmount = Math.random() < 0.18 ? round3(subtotal * 0.05) : 0;
      const totalAmount = round3(Math.max(0, subtotal + taxAmount - discountAmount));
      const paidAmount = status === "CANCELED" ? 0 : totalAmount;

      const orderNumber = `INV-${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}${String(createdAt.getHours()).padStart(2, "0")}${String(createdAt.getMinutes()).padStart(2, "0")}${String(createdAt.getSeconds()).padStart(2, "0")}-${randomInt(1000, 9999)}`;

      const customer =
        channel === "ONLINE"
          ? await prisma.customer.upsert({
              where: { phone: `0159${String(i).padStart(6, "0")}` },
              update: {},
              create: {
                fullName: `عميل ${i + 1}`,
                phone: `0159${String(i).padStart(6, "0")}`,
              },
              select: { id: true },
            })
          : null;

      await prisma.order.create({
        data: {
          orderNumber,
          channel,
          status,
          customerId: customer?.id ?? null,
          notes: channel === "ONLINE" ? `DELIVERY_ADDRESS: حي ${randomInt(1, 30)} - شارع ${randomInt(1, 99)}` : null,
          subtotal,
          discountType: discountAmount > 0 ? "FIXED" : null,
          discountValue: discountAmount > 0 ? discountAmount : null,
          discountAmount,
          taxAmount,
          shippingFee: 0,
          totalAmount,
          paymentMethod,
          paymentStatus: status === "CANCELED" ? "UNPAID" : "PAID",
          paidAmount,
          changeAmount: 0,
          completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null,
          canceledAt: status === "CANCELED" ? new Date(createdAt.getTime() + 20 * 60 * 1000) : null,
          createdAt,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              costAtSale: line.costAtSale,
              discountAmount: 0,
              taxAmount: line.taxAmount,
              lineTotal: line.lineTotal,
            })),
          },
        },
      });
    }
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
