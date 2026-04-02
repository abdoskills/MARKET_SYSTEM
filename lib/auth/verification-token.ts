import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

function verificationIdentifier(email: string) {
  return `verify:${email.trim().toLowerCase()}`;
}

function resetIdentifier(email: string) {
  return `reset:${email.trim().toLowerCase()}`;
}

export async function issueEmailVerificationCode(email: string) {
  const code = generateSixDigitCode();
  const hashedCode = sha256(code);
  const identifier = verificationIdentifier(email);
  const expires = new Date(Date.now() + TEN_MINUTES_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashedCode,
        expires,
      },
    }),
  ]);

  return { code, expires };
}

export async function verifyEmailCode(email: string, code: string) {
  const identifier = verificationIdentifier(email);
  const hashedCode = sha256(code.trim());
  const now = new Date();

  const token = await prisma.verificationToken.findFirst({
    where: {
      identifier,
      token: hashedCode,
      expires: { gt: now },
    },
  });

  if (!token) return false;

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: {
        emailVerified: now,
        isActive: true,
      },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier } }),
  ]);

  return true;
}

export async function issuePasswordResetLinkToken(email: string) {
  const rawToken = generateResetToken();
  const hashedToken = sha256(rawToken);
  const identifier = resetIdentifier(email);
  const expires = new Date(Date.now() + ONE_HOUR_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashedToken,
        expires,
      },
    }),
  ]);

  return { rawToken, expires };
}

export async function consumePasswordResetToken(token: string) {
  const hashedToken = sha256(token);
  const now = new Date();

  const existing = await prisma.verificationToken.findFirst({
    where: {
      identifier: { startsWith: "reset:" },
      token: hashedToken,
      expires: { gt: now },
    },
  });

  if (!existing) return null;

  const email = existing.identifier.replace(/^reset:/, "");

  await prisma.verificationToken.deleteMany({
    where: {
      identifier: existing.identifier,
      token: hashedToken,
    },
  });

  return { email };
}
