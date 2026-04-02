import { executeCheckout, type CheckoutInput } from "@/server/services/checkout.service";
import { captureError } from "@/lib/monitoring/sentry";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getServerSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { sendReceipt } from "@/server/services/email.service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const CheckoutSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  channel: z.enum(["POS", "ONLINE"]).optional(),
  promoCode: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["CASH", "CARD"]).optional(),
  receivedAmount: z.coerce.number().min(0).optional(),
  addChangeToWallet: z.coerce.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
}).superRefine((value, ctx) => {
  const channel = value.channel ?? "POS";
  if (channel !== "ONLINE") return;

  if (!value.phone?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "PHONE_REQUIRED" });
  }

  if (!value.address?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "ADDRESS_REQUIRED" });
  }
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rate = await checkRateLimit({ key: `checkout:${ip}`, limit: 60, windowMs: 60_000 });
    if (!rate.ok) {
      return NextResponse.json({ ok: false, error: "TOO_MANY_REQUESTS" }, { status: 429 });
    }

    const parsed = CheckoutSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
    }

    const session = await getServerSession();
    const channel = parsed.data.channel ?? "POS";
    const isStaff = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "CASHIER";

    if (channel === "POS" && !isStaff) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const result = await executeCheckout({
      ...(parsed.data as CheckoutInput),
      walletUserId: session?.userId,
    });

    const receiptPayload = result.receipt.payload;

    const receiptUser = session?.userId
      ? await prisma.user.findUnique({
          where: { id: session.userId },
          select: { email: true, fullName: true },
        })
      : result.order.phone
        ? await prisma.user.findFirst({
            where: { phone: result.order.phone },
            select: { email: true, fullName: true },
          })
        : null;

    if (receiptUser?.email) {
      void sendReceipt({
        to: receiptUser.email,
        fullName: receiptUser.fullName,
        order: {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          createdAt: result.order.createdAt,
          totalAmount: result.order.totalAmount,
          paymentMethod: result.order.paymentMethod,
        },
        items: receiptPayload.items,
        walletUpdate: result.walletUpdate,
      }).catch((error) => {
        captureError(error, { route: "/api/pos/checkout", stage: "send-receipt" });
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: session?.userId ?? null,
        action: "CHECKOUT_CREATED",
        ipAddress: ip,
        details: {
          orderNumber: result.order.orderNumber,
          totalAmount: result.order.totalAmount,
          channel,
        },
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureError(error, { route: "/api/pos/checkout" });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ ok: false, error: "TRANSACTION_CONFLICT", retryable: true }, { status: 409 });
    }

    if (error instanceof Error) {
      if (error.message === "EMPTY_CART") {
        return NextResponse.json({ ok: false, error: "EMPTY_CART" }, { status: 400 });
      }

      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        return NextResponse.json(
          { ok: false, error: "INSUFFICIENT_STOCK", details: error.message.split(":")[1] },
          { status: 409 },
        );
      }

      if (error.message.startsWith("PRODUCT_NOT_FOUND:")) {
        return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND" }, { status: 404 });
      }

      if (error.message === "INSUFFICIENT_RECEIVED") {
        return NextResponse.json({ ok: false, error: "INSUFFICIENT_RECEIVED" }, { status: 400 });
      }

      if (error.message === "INVALID_CODE" || error.message === "CODE_EXPIRED" || error.message === "CODE_INACTIVE") {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: false, error: "CHECKOUT_FAILED" }, { status: 500 });
  }
}
