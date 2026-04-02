import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import QRCode from "qrcode";
import { validatePromoCode } from "@/server/services/promo.service";

export type CheckoutItemInput = {
  productId?: string;
  quantity?: number;
};

export type CheckoutInput = {
  phone?: string;
  address?: string;
  channel?: "ONLINE" | "POS";
  promoCode?: string;
  paymentMethod?: "CASH" | "CARD";
  receivedAmount?: number;
  addChangeToWallet?: boolean;
  walletUserId?: string;
  items?: CheckoutItemInput[];
};

export type CheckoutServiceResult = {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    createdAt: string;
    paymentMethod: "CASH" | "CARD";
    paidAmount: number;
    changeAmount: number;
    phone: string | null;
  };
  walletUpdate?: {
    addedAmount: number;
    newBalance: number;
  };
  receipt: {
    id: string;
    receiptNumber: string;
    printableHtml: string;
    payload: {
      orderNumber: string;
      receiptNumber: string;
      phone: string | null;
      paymentMethod: "CASH" | "CARD";
      paidAmount: number;
      changeAmount: number;
      createdAt: string;
      items: Array<{ nameAr: string; quantity: number; unitPrice: number; lineTotal: number }>;
      subtotal: number;
      discountAmount: number;
      tax: number;
      total: number;
      qrPayload: string;
      qrDataUrl: string;
    };
  };
};

function toThreeDecimals(value: number) {
  return Math.round(value * 1000) / 1000;
}

function buildOrderNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const stamp = now
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(4, 14);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${year}-${stamp}-${random}`;
}

function buildReceiptNumber() {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 12);
  const random = Math.floor(Math.random() * 900 + 100);
  return `RCPT-${stamp}-${random}`;
}

async function buildPrintableHtml(payload: {
  orderNumber: string;
  receiptNumber: string;
  phone: string | null;
  paymentMethod: "CASH" | "CARD";
  paidAmount: number;
  changeAmount: number;
  createdAt: string;
  items: Array<{ nameAr: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
}) {
  const rows = payload.items
    .map(
      (item) =>
        `<tr>
          <td>${item.nameAr}</td>
          <td>${item.quantity.toFixed(3)}</td>
          <td>${item.unitPrice.toFixed(2)}</td>
          <td>${item.lineTotal.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  const qrPayload = JSON.stringify({
    invoice: payload.orderNumber,
    date: payload.createdAt,
    total: payload.total.toFixed(2),
  });

  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 128 });

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>إيصال ${payload.receiptNumber}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      body {
        font-family: Arial, sans-serif;
        width: 72mm;
        margin: 0 auto;
        padding: 0;
        color: #111;
      }
      h1, h2, p { margin: 0 0 8px; }
      h1 { font-size: 16px; }
      p { font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border-bottom: 1px dashed #ddd; padding: 6px 4px; font-size: 11px; text-align: right; }
      .totals { margin-top: 12px; }
      .totals p { margin: 4px 0; }
      .grand { font-size: 15px; font-weight: 700; color: #0a7a4b; }
      .qr-wrap { text-align: center; margin-top: 10px; }
      .qr-wrap img { width: 95px; height: 95px; }
      @media print {
        .no-print { display: none !important; }
        body { width: 72mm; }
      }
    </style>
  </head>
  <body>
    <h1>Pristine POS</h1>
    <p>رقم الطلب: ${payload.orderNumber}</p>
    <p>رقم الإيصال: ${payload.receiptNumber}</p>
    <p>التاريخ: ${new Date(payload.createdAt).toLocaleString("ar-EG")}</p>
    <p>الهاتف: ${payload.phone ?? "-"}</p>
    <p>طريقة الدفع: ${payload.paymentMethod === "CASH" ? "نقداً" : "بطاقة"}</p>
    <table>
      <thead>
        <tr>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <p>المجموع الفرعي: ${payload.subtotal.toFixed(2)} ج.م</p>
      <p>الخصم: -${payload.discountAmount.toFixed(2)} ج.م</p>
      <p>الضريبة: ${payload.tax.toFixed(2)} ج.م</p>
      <p class="grand">الإجمالي: ${payload.total.toFixed(2)} ج.م</p>
      <p>المبلغ المستلم: ${payload.paidAmount.toFixed(2)} ج.م</p>
      <p>الفكة: ${payload.changeAmount.toFixed(2)} ج.م</p>
    </div>
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="Invoice QR" />
      <p>تحقق الفاتورة</p>
    </div>
  </body>
</html>`;

  return { html, qrPayload, qrDataUrl };
}

export async function executeCheckout(input: CheckoutInput): Promise<CheckoutServiceResult> {
  const paymentMethod: "CASH" | "CARD" = input.paymentMethod === "CARD" ? "CARD" : "CASH";
  const channel: "ONLINE" | "POS" = input.channel === "ONLINE" ? "ONLINE" : "POS";
  const initialStatus = channel === "ONLINE" ? "PENDING" : "COMPLETED";
  const phone = (input.phone ?? "").trim();
  const address = (input.address ?? "").trim();
  const promoCode = (input.promoCode ?? "").trim().toUpperCase();
  const receivedAmount = Number(input.receivedAmount ?? 0);
  const addChangeToWallet = Boolean(input.addChangeToWallet);
  const walletUserId = input.walletUserId?.trim() || null;

  const aggregated = new Map<string, number>();
  for (const row of input.items ?? []) {
    if (!row?.productId) continue;
    const quantity = Number(row.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    aggregated.set(row.productId, toThreeDecimals((aggregated.get(row.productId) ?? 0) + quantity));
  }

  if (aggregated.size === 0) {
    throw new Error("EMPTY_CART");
  }

  const orderNumber = buildOrderNumber();
  const receiptNumber = buildReceiptNumber();

  const runTransaction = () =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let customerId: string | null = null;

    if (phone) {
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {},
        create: {
          phone,
          fullName: `عميل ${phone}`,
        },
        select: { id: true },
      });
      customerId = customer.id;
    }

    const lines: Array<{
      productId: string;
      nameAr: string;
      quantity: number;
      unitPrice: number;
      costAtSale: number;
      taxAmount: number;
      lineTotal: number;
      lineSubtotal: number;
    }> = [];

    const sortedEntries = Array.from(aggregated.entries()).sort(([a], [b]) => a.localeCompare(b));

    for (const [productId, quantity] of sortedEntries) {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          nameAr: true,
          isActive: true,
          salePrice: true,
          costPrice: true,
          taxRatePercent: true,
        },
      });

      if (!product || !product.isActive) {
        throw new Error(`PRODUCT_NOT_FOUND:${productId}`);
      }

      const stockUpdate = await tx.product.updateMany({
        where: {
          id: product.id,
          isActive: true,
          stockQty: { gte: quantity },
        },
        data: {
          stockQty: { decrement: quantity },
        },
      });

      if (stockUpdate.count === 0) {
        throw new Error(`INSUFFICIENT_STOCK:${product.nameAr}`);
      }

      const unitPrice = Number(product.salePrice);
      const costAtSale = Number(product.costPrice);
      const taxRatePercent = Number(product.taxRatePercent);
      const lineSubtotal = toThreeDecimals(unitPrice * quantity);
      const taxAmount = toThreeDecimals(lineSubtotal * (taxRatePercent / 100));
      const lineTotal = toThreeDecimals(lineSubtotal + taxAmount);

      lines.push({
        productId: product.id,
        nameAr: product.nameAr,
        quantity,
        unitPrice,
        costAtSale,
        taxAmount,
        lineSubtotal,
        lineTotal,
      });
    }

    const subtotal = toThreeDecimals(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const taxAmount = toThreeDecimals(lines.reduce((sum, line) => sum + line.taxAmount, 0));
    let discountAmount = 0;

    if (promoCode) {
      const promo = await validatePromoCode({ code: promoCode, subtotal });
      if (promo.ok) {
        discountAmount = toThreeDecimals(promo.discountAmount);
      } else {
        throw new Error(promo.error);
      }
    }

    const totalAmount = toThreeDecimals(Math.max(0, subtotal + taxAmount - discountAmount));
    const normalizedReceived =
      paymentMethod === "CARD" ? totalAmount : toThreeDecimals(Number.isFinite(receivedAmount) ? receivedAmount : 0);

    if (paymentMethod === "CASH" && normalizedReceived < totalAmount) {
      throw new Error("INSUFFICIENT_RECEIVED");
    }

    const changeAmount = toThreeDecimals(Math.max(0, normalizedReceived - totalAmount));

    const order = await tx.order.create({
      data: {
        orderNumber,
        channel,
        status: initialStatus,
        customerId,
        notes: address ? `DELIVERY_ADDRESS: ${address}` : null,
        subtotal,
        discountType: discountAmount > 0 ? "FIXED" : null,
        discountValue: discountAmount > 0 ? discountAmount : null,
        discountAmount,
        taxAmount,
        shippingFee: 0,
        totalAmount,
        paymentMethod,
        paymentStatus: "PAID",
        paidAmount: normalizedReceived,
        changeAmount,
        completedAt: initialStatus === "COMPLETED" ? new Date() : null,
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
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        createdAt: true,
      },
    });

    await tx.inventoryMovement.createMany({
      data: lines.map((line) => ({
        productId: line.productId,
        type: "SALE",
        quantity: line.quantity,
        referenceOrderId: order.id,
        note: `POS checkout ${order.orderNumber}`,
      })),
    });

    const rawReceiptPayload = {
      orderNumber: order.orderNumber,
      receiptNumber,
      phone: phone || null,
      paymentMethod,
      paidAmount: normalizedReceived,
      changeAmount,
      createdAt: order.createdAt.toISOString(),
      items: lines.map((line) => ({
        nameAr: line.nameAr,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      tax: Number(order.taxAmount),
      total: Number(order.totalAmount),
    };

    const printResult = await buildPrintableHtml(rawReceiptPayload);
    const receiptPayload = {
      ...rawReceiptPayload,
      qrPayload: printResult.qrPayload,
      qrDataUrl: printResult.qrDataUrl,
    };

    const receipt = await tx.receipt.create({
      data: {
        orderId: order.id,
        receiptNumber,
        printableHtml: printResult.html,
        payloadJson: receiptPayload,
      },
      select: {
        id: true,
        receiptNumber: true,
        printableHtml: true,
      },
    });

    let walletUpdate: CheckoutServiceResult["walletUpdate"];
    if (addChangeToWallet && walletUserId && changeAmount > 0) {
      const walletOwner = await tx.user.findUnique({
        where: { id: walletUserId },
        select: { walletBalance: true },
      });

      if (walletOwner) {
        const currentBalance = Number(walletOwner.walletBalance);
        const newBalance = toThreeDecimals(currentBalance + changeAmount);

        await tx.user.update({
          where: { id: walletUserId },
          data: { walletBalance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            userId: walletUserId,
            type: "FAKKA_ADDED",
            amount: changeAmount,
            balanceAfter: newBalance,
            note: `إضافة فكة من الطلب ${order.orderNumber}`,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              channel,
            },
          },
        });

        walletUpdate = {
          addedAmount: changeAmount,
          newBalance,
        };
      }
    }

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: Number(order.totalAmount),
          subtotal: Number(order.subtotal),
          discountAmount: Number(order.discountAmount),
          taxAmount: Number(order.taxAmount),
          createdAt: order.createdAt.toISOString(),
          paymentMethod,
          paidAmount: normalizedReceived,
          changeAmount,
          phone: phone || null,
        },
        walletUpdate,
        receipt: {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          printableHtml: receipt.printableHtml ?? "",
          payload: receiptPayload,
        },
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
      maxWait: 5_000,
    });

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await runTransaction();
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";

      if (isSerializationConflict && attempt < maxRetries) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("CHECKOUT_FAILED");
}
