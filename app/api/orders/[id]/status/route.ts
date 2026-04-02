import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/server";
import { captureError } from "@/lib/monitoring/sentry";
import { addAuditEvent } from "@/lib/security/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const BodySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  try {
    const parsedParams = ParamsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return NextResponse.json({ ok: false, error: "INVALID_ORDER_ID" }, { status: 400 });
    }

    const parsedBody = BodySchema.safeParse((await request.json()) as unknown);
    if (!parsedBody.success) {
      return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 400 });
    }

    const { id } = parsedParams.data;
    const { status } = parsedBody.data;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
        canceledAt: status === "CANCELED" ? new Date() : null,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });

    if (status === "CANCELED") {
      addAuditEvent({
        action: "VOIDED_ORDER",
        userId: session.userId,
        entityId: updated.id,
        details: {
          orderNumber: updated.orderNumber,
        },
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    captureError(error, { route: "/api/orders/[id]/status" });
    return NextResponse.json({ ok: false, error: "UPDATE_STATUS_FAILED" }, { status: 500 });
  }
}
