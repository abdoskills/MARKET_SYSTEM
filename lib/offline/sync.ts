import {
  applyOfflineSyncResults,
  getOfflineQueueSummary,
  getRetryableOfflineOrders,
  markOfflineOrdersSyncing,
} from "@/lib/offline/indexeddb";

let isSyncRunning = false;

export async function triggerOfflineSync() {
  if (typeof window === "undefined") return;
  if (!navigator.onLine) return;
  if (isSyncRunning) return;

  try {
    const orders = getRetryableOfflineOrders();
    if (orders.length === 0) return;

    isSyncRunning = true;
    markOfflineOrdersSyncing(orders.map((item) => item.localId));

    const response = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orders: orders.map((item) => ({
          localId: item.localId,
          payload: item.payload,
        })),
      }),
    });

    if (!response.ok) {
      applyOfflineSyncResults({
        synced: [],
        failed: orders.map((order) => ({
          localId: order.localId,
          reason: "NETWORK_OR_SERVER_FAILURE",
          code: "RETRYABLE",
        })),
      });
      return;
    }

    const data = (await response.json()) as {
      synced?: string[];
      failed?: Array<{ localId: string; reason: string; code?: "RETRYABLE" | "PERMANENT" }>;
    };

    applyOfflineSyncResults({
      synced: data.synced ?? [],
      failed: data.failed ?? [],
    });
  } catch {
    const retryable = getRetryableOfflineOrders();
    applyOfflineSyncResults({
      synced: [],
      failed: retryable.map((order) => ({
        localId: order.localId,
        reason: "SYNC_RUNTIME_ERROR",
        code: "RETRYABLE",
      })),
    });
  } finally {
    isSyncRunning = false;
  }
}

export function getOfflineSyncState() {
  return {
    ...getOfflineQueueSummary(),
    isSyncRunning,
  };
}
