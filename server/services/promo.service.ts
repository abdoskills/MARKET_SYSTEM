import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type PromoKind = "PERCENT" | "FIXED";

export type PromoCodeView = {
  id: string;
  code: string;
  kind: PromoKind;
  value: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PromoPayload = {
  code: string;
  kind: PromoKind;
  value: number;
  isActive: boolean;
  expiresAt: string | null;
};

const PROMO_ENTITY_TYPE = "PROMO_CODE";

function toThreeDecimals(value: number) {
  return Math.round(value * 1000) / 1000;
}

function parsePromoPayload(payload: Prisma.JsonValue | null): PromoPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const raw = payload as Record<string, unknown>;
  const code = typeof raw.code === "string" ? raw.code.trim().toUpperCase() : "";
  const kind = raw.kind === "FIXED" ? "FIXED" : raw.kind === "PERCENT" ? "PERCENT" : null;
  const value = Number(raw.value ?? 0);
  const isActive = Boolean(raw.isActive);
  const expiresAt = typeof raw.expiresAt === "string" && raw.expiresAt.trim() ? raw.expiresAt : null;

  if (!code || !kind || !Number.isFinite(value) || value <= 0) return null;

  return {
    code,
    kind,
    value,
    isActive,
    expiresAt,
  };
}

function mapRowToPromo(row: {
  id: string;
  localEntityId: string;
  payloadJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): PromoCodeView | null {
  const parsed = parsePromoPayload(row.payloadJson);
  if (!parsed) return null;

  return {
    id: row.id,
    code: parsed.code || row.localEntityId,
    kind: parsed.kind,
    value: parsed.value,
    isActive: parsed.isActive,
    expiresAt: parsed.expiresAt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPromoCodes() {
  const rows = await prisma.offlineSyncEvent.findMany({
    where: { entityType: PROMO_ENTITY_TYPE },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      localEntityId: true,
      payloadJson: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 300,
  });

  return rows
    .map((row) => mapRowToPromo(row))
    .filter((row): row is PromoCodeView => Boolean(row));
}

export async function upsertPromoCode(input: {
  code: string;
  kind: PromoKind;
  value: number;
  expiresAt?: string | null;
  isActive?: boolean;
}) {
  const code = input.code.trim().toUpperCase();
  const payload: PromoPayload = {
    code,
    kind: input.kind,
    value: toThreeDecimals(input.value),
    isActive: input.isActive ?? true,
    expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
  };

  const existing = await prisma.offlineSyncEvent.findFirst({
    where: {
      entityType: PROMO_ENTITY_TYPE,
      localEntityId: code,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const row = existing
    ? await prisma.offlineSyncEvent.update({
        where: { id: existing.id },
        data: {
          payloadJson: payload,
          status: "SYNCED",
          deviceId: "server",
        },
        select: {
          id: true,
          localEntityId: true,
          payloadJson: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    : await prisma.offlineSyncEvent.create({
        data: {
          entityType: PROMO_ENTITY_TYPE,
          localEntityId: code,
          deviceId: "server",
          payloadJson: payload,
          status: "SYNCED",
        },
        select: {
          id: true,
          localEntityId: true,
          payloadJson: true,
          createdAt: true,
          updatedAt: true,
        },
      });

  const mapped = mapRowToPromo(row);
  if (!mapped) throw new Error("INVALID_PROMO_PAYLOAD");
  return mapped;
}

export async function setPromoStatus(id: string, isActive: boolean) {
  const row = await prisma.offlineSyncEvent.findFirst({
    where: { id, entityType: PROMO_ENTITY_TYPE },
    select: {
      id: true,
      localEntityId: true,
      payloadJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) return null;

  const payload = parsePromoPayload(row.payloadJson);
  if (!payload) return null;

  const updated = await prisma.offlineSyncEvent.update({
    where: { id: row.id },
    data: {
      payloadJson: {
        ...payload,
        isActive,
      },
      status: "SYNCED",
    },
    select: {
      id: true,
      localEntityId: true,
      payloadJson: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return mapRowToPromo(updated);
}

export async function validatePromoCode(input: { code: string; subtotal: number }) {
  const code = input.code.trim().toUpperCase();
  if (!code) {
    return { ok: false as const, error: "EMPTY_CODE", discountAmount: 0 };
  }

  const row = await prisma.offlineSyncEvent.findFirst({
    where: {
      entityType: PROMO_ENTITY_TYPE,
      localEntityId: code,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      payloadJson: true,
    },
  });

  const payload = parsePromoPayload(row?.payloadJson ?? null);
  if (!payload) {
    return { ok: false as const, error: "INVALID_CODE", discountAmount: 0 };
  }

  if (!payload.isActive) {
    return { ok: false as const, error: "CODE_INACTIVE", discountAmount: 0 };
  }

  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now()) {
    return { ok: false as const, error: "CODE_EXPIRED", discountAmount: 0 };
  }

  const subtotal = Math.max(0, Number(input.subtotal || 0));
  let discountAmount =
    payload.kind === "PERCENT"
      ? toThreeDecimals(subtotal * (payload.value / 100))
      : toThreeDecimals(payload.value);

  discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

  return {
    ok: true as const,
    code: payload.code,
    kind: payload.kind,
    value: payload.value,
    discountAmount,
  };
}
