import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";

const RegisterSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(8).max(120),
  })
  .refine((v) => Boolean(v.email || v.phone), {
    message: "EMAIL_OR_PHONE_REQUIRED",
    path: ["email"],
  })
  .refine(
    (v) => {
      if (!v.email) return true;
      return z.string().email().safeParse(v.email).success;
    },
    { message: "INVALID_EMAIL", path: ["email"] }
  );

export async function POST(request: NextRequest) {
  try {
    const parsed = RegisterSchema.safeParse((await request.json()) as unknown);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ ok: false, error: "USER_ALREADY_EXISTS" }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        fullName: data.fullName,
        email,
        phone,
        passwordHash: hashPassword(data.password),
        role: "CLIENT" as Role,
        isActive: true,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "REGISTER_FAILED" }, { status: 500 });
  }
}
