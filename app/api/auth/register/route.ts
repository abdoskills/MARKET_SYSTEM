import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { issueEmailVerificationCode } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/server/services/email.service";
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

    const passwordHash = await hashPassword(data.password);

    const createdUser = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email,
        phone,
        passwordHash,
        role: "CLIENT" as Role,
        isActive: Boolean(!email),
      },
      select: { id: true, fullName: true, email: true },
    });

    if (createdUser.email) {
      const { code } = await issueEmailVerificationCode(createdUser.email);
      await sendVerificationEmail({
        to: createdUser.email,
        fullName: createdUser.fullName,
        code,
      });
    }

    return NextResponse.json({ ok: true, needsVerification: Boolean(createdUser.email) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SMTP_NOT_CONFIGURED") {
      return NextResponse.json({ ok: false, error: "EMAIL_NOT_CONFIGURED" }, { status: 500 });
    }
    return NextResponse.json({ ok: false, error: "REGISTER_FAILED" }, { status: 500 });
  }
}
