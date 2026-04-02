export type OfflineReceipt = {
  id: string;
  payload: unknown;
  createdAt: number;
};

export type OfflineQueueStatus = "PENDING" | "SYNCING" | "RETRY" | "CONFLICT";

export type OfflineCheckoutOrder = {
  localId: string;
  payload: {
    phone?: string;
    address?: string;
    promoCode?: string;
    channel?: "ONLINE" | "POS";
    paymentMethod?: "CASH" | "CARD";
    receivedAmount?: number;
    items?: Array<{ productId?: string; quantity?: number }>;
  };
  createdAt: number;
  status: OfflineQueueStatus;
  retryCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  nextRetryAt?: number;
};

const OFFLINE_ORDERS_KEY = "offline_checkout_orders_v1";
const LAST_SYNCED_AT_KEY = "offline_last_synced_at_v1";
const BACKOFF_MS = [0, 5_000, 15_000, 30_000, 60_000, 120_000];

export function isOfflineSupported() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function getPendingOfflineOrders(): OfflineCheckoutOrder[] {
  if (!isOfflineSupported()) return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineCheckoutOrder[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      status: item.status ?? "PENDING",
      retryCount: Number.isFinite(item.retryCount) ? item.retryCount : 0,
    }));
  } catch {
    return [];
  }
}

function persistOrders(orders: OfflineCheckoutOrder[]) {
  if (!isOfflineSupported()) return;
  window.localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));
}

function persistLastSyncedAt(value: number) {
  if (!isOfflineSupported()) return;
  window.localStorage.setItem(LAST_SYNCED_AT_KEY, String(value));
}

export function buildOfflineOrderPayload(payload: OfflineCheckoutOrder["payload"]): OfflineCheckoutOrder {
  return {
    localId: `offline-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    payload,
    createdAt: Date.now(),
    status: "PENDING",
    retryCount: 0,
  };
}

export function savePendingOfflineOrder(order: OfflineCheckoutOrder | OfflineCheckoutOrder["payload"]) {
  if (!isOfflineSupported()) return;
  const existing = getPendingOfflineOrders();
  const normalized = "localId" in order ? order : buildOfflineOrderPayload(order);
  existing.push(normalized);
  persistOrders(existing);
}

export function removePendingOfflineOrders(localIds: string[]) {
  if (!isOfflineSupported()) return;
  if (localIds.length === 0) return;
  const keep = getPendingOfflineOrders().filter((item) => !localIds.includes(item.localId));
  persistOrders(keep);
}

export function getRetryableOfflineOrders(now = Date.now()) {
  return getPendingOfflineOrders().filter(
    (order) =>
      order.status !== "CONFLICT" &&
      (order.nextRetryAt === undefined || order.nextRetryAt <= now),
  );
}

export function markOfflineOrdersSyncing(localIds: string[]) {
  if (!isOfflineSupported() || localIds.length === 0) return;
  const next = getPendingOfflineOrders().map((order) =>
    localIds.includes(order.localId)
      ? {
          ...order,
          status: "SYNCING" as OfflineQueueStatus,
          lastAttemptAt: Date.now(),
        }
      : order,
  );
  persistOrders(next);
}

export function applyOfflineSyncResults(input: {
  synced: string[];
  failed: Array<{ localId: string; reason: string; code?: "RETRYABLE" | "PERMANENT" }>;
}) {
  if (!isOfflineSupported()) return;

  const now = Date.now();
  const failedMap = new Map(input.failed.map((item) => [item.localId, item]));

  const next = getPendingOfflineOrders()
    .filter((order) => !input.synced.includes(order.localId))
    .map((order) => {
      const failed = failedMap.get(order.localId);
      if (!failed) return order;

      if (failed.code === "PERMANENT") {
        return {
          ...order,
          status: "CONFLICT" as OfflineQueueStatus,
          lastError: failed.reason,
          lastAttemptAt: now,
        };
      }

      const retryCount = order.retryCount + 1;
      const backoff = BACKOFF_MS[Math.min(retryCount, BACKOFF_MS.length - 1)];
      return {
        ...order,
        status: "RETRY" as OfflineQueueStatus,
        retryCount,
        lastError: failed.reason,
        lastAttemptAt: now,
        nextRetryAt: now + backoff,
      };
    });

  persistOrders(next);
  if (input.synced.length > 0) {
    persistLastSyncedAt(now);
  }
}

export function getOfflineQueueSummary() {
  const orders = getPendingOfflineOrders();
  const now = Date.now();

  const pending = orders.filter((item) => item.status === "PENDING" || item.status === "SYNCING").length;
  const retry = orders.filter((item) => item.status === "RETRY").length;
  const conflict = orders.filter((item) => item.status === "CONFLICT").length;
  const dueNow = orders.filter(
    (item) => item.status !== "CONFLICT" && (item.nextRetryAt === undefined || item.nextRetryAt <= now),
  ).length;

  return {
    total: orders.length,
    pending,
    retry,
    conflict,
    dueNow,
  };
}

export function clearConflictedOfflineOrders() {
  if (!isOfflineSupported()) return;
  const keep = getPendingOfflineOrders().filter((item) => item.status !== "CONFLICT");
  persistOrders(keep);
}

export function listConflictedOfflineOrders() {
  return getPendingOfflineOrders().filter((item) => item.status === "CONFLICT");
}

export function resolveConflictKeepLocal(localId: string) {
  if (!isOfflineSupported()) return;
  const next = getPendingOfflineOrders().map((item) =>
    item.localId === localId
      ? {
          ...item,
          status: "PENDING" as OfflineQueueStatus,
          retryCount: 0,
          lastError: undefined,
          nextRetryAt: undefined,
        }
      : item,
  );
  persistOrders(next);
}

export function resolveConflictKeepServer(localId: string) {
  removePendingOfflineOrders([localId]);
}

export function resolveConflictMergeManual(localId: string, items: Array<{ productId?: string; quantity?: number }>) {
  if (!isOfflineSupported()) return;
  const next = getPendingOfflineOrders().map((item) =>
    item.localId === localId
      ? {
          ...item,
          payload: {
            ...item.payload,
            items,
          },
          status: "PENDING" as OfflineQueueStatus,
          retryCount: 0,
          lastError: undefined,
          nextRetryAt: undefined,
        }
      : item,
  );
  persistOrders(next);
}

export function getLastSyncedAt() {
  if (!isOfflineSupported()) return null;
  const value = Number(window.localStorage.getItem(LAST_SYNCED_AT_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}
