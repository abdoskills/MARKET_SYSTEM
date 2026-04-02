import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "ADMIN" | "MANAGER" | "CASHIER" | "CLIENT";

export type SessionPayload = {
  userId: string;
  role: SessionRole;
};

function getCookieName() {
  if (process.env.NODE_ENV === "production") {
    return "__Host-auth_token";
  }
  return "auth_token";
}

function getSecretKey() {
  const secret = process.env.JWT_SECRET ?? "dev-supermarket-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function getAuthCookieName() {
  return getCookieName();
}

export function normalizeRole(value: string | null | undefined): SessionRole {
  const role = (value ?? "").toUpperCase();
  if (role === "ADMIN") return "ADMIN";
  if (role === "MANAGER") return "MANAGER";
  if (role === "CLIENT") return "CLIENT";
  return "CASHIER";
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const role = normalizeRole(typeof payload.role === "string" ? payload.role : "CASHIER");
  if (!userId) throw new Error("INVALID_SESSION");
  return { userId, role } as SessionPayload;
}
