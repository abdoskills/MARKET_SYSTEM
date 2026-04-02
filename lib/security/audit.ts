export type AuditAction = "LOGIN" | "PRICE_CHANGE" | "VOIDED_ORDER";

export type AuditEvent = {
  id: string;
  action: AuditAction;
  userId: string;
  at: string;
  entityId?: string;
  details?: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line no-var
  var __pristineAuditEvents: AuditEvent[] | undefined;
}

function getStore() {
  if (!globalThis.__pristineAuditEvents) {
    globalThis.__pristineAuditEvents = [];
  }
  return globalThis.__pristineAuditEvents;
}

export function addAuditEvent(input: {
  action: AuditAction;
  userId: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const row: AuditEvent = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    action: input.action,
    userId: input.userId,
    at: new Date().toISOString(),
    entityId: input.entityId,
    details: input.details,
  };

  const store = getStore();
  store.unshift(row);
  if (store.length > 1000) {
    store.length = 1000;
  }

  return row;
}

export function listAuditEvents(limit = 200) {
  return getStore().slice(0, Math.max(1, Math.min(limit, 1000)));
}
