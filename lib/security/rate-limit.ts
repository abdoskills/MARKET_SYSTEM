import { prisma } from "@/lib/prisma";

export async function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + input.windowMs);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.rateLimitBucket.findUnique({ where: { key: input.key } });

    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      await tx.rateLimitBucket.upsert({
        where: { key: input.key },
        update: { count: 1, resetAt: nextResetAt },
        create: { key: input.key, count: 1, resetAt: nextResetAt },
      });

      return { ok: true, remaining: Math.max(0, input.limit - 1), resetAt: nextResetAt.getTime() };
    }

    if (existing.count >= input.limit) {
      return { ok: false, remaining: 0, resetAt: existing.resetAt.getTime() };
    }

    const updated = await tx.rateLimitBucket.update({
      where: { key: input.key },
      data: { count: { increment: 1 } },
      select: { count: true, resetAt: true },
    });

    return {
      ok: true,
      remaining: Math.max(0, input.limit - updated.count),
      resetAt: updated.resetAt.getTime(),
    };
  });

  if (Math.random() < 0.02) {
    void prisma.rateLimitBucket
      .deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      .catch(() => undefined);
  }

  return result;
}
