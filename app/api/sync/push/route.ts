import { NextResponse } from "next/server";
import { executeCheckout, type CheckoutInput } from "@/server/services/checkout.service";
import { captureError } from "@/lib/monitoring/sentry";

type OfflineOrderPayload = {
  localId: string;
  payload: CheckoutInput;
};

function classifyFailureReason(reason: string): "RETRYABLE" | "PERMANENT" {
  if (
    reason === "EMPTY_CART" ||
    reason === "INSUFFICIENT_RECEIVED" ||
    reason.startsWith("INSUFFICIENT_STOCK:") ||
    reason.startsWith("PRODUCT_NOT_FOUND:")
  ) {
    return "PERMANENT";
  }

  return "RETRYABLE";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { orders?: OfflineOrderPayload[] };
    const orders = body.orders ?? [];

    const synced: string[] = [];
    const failed: Array<{ localId: string; reason: string; code: "RETRYABLE" | "PERMANENT" }> = [];

    for (const entry of orders) {
      try {
        await executeCheckout(entry.payload);
        synced.push(entry.localId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "SYNC_FAILED";
        failed.push({
          localId: entry.localId,
          reason,
          code: classifyFailureReason(reason),
        });
      }
    }

    return NextResponse.json({ ok: true, synced, failed });
  } catch (error) {
    captureError(error, { route: "/api/sync/push" });
    return NextResponse.json({ ok: false, error: "SYNC_PUSH_FAILED" }, { status: 500 });
  }
}
