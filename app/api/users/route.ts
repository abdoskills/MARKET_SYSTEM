import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getUsersList } from "@/server/services/dashboard.service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateUserSchema = z
  .object({
    userId: z.string().trim().min(1),
    role: z.enum(["ADMIN", "CASHIER", "CLIENT"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "NOTHING_TO_UPDATE",
  });

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const data = await getUsersList();
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const parsed = UpdateUserSchema.safeParse((await request.json()) as unknown);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role, isActive } = parsed.data;

  if (userId === session.userId && role && role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "CANNOT_DEMOTE_SELF" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      isActive: true,
      email: true,
      phone: true,
    },
  });

  return NextResponse.json({ ok: true, data: updated });
}
