import { cookies } from "next/headers";
import { getAuthCookieName, type SessionPayload, type SessionRole, verifySessionToken } from "@/lib/auth/session";

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getAuthCookieName())?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function hasAnyRole(role: SessionRole | undefined, allowed: SessionRole[]) {
  if (!role) return false;
  return allowed.includes(role);
}
