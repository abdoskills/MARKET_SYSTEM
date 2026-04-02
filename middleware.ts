import { NextRequest, NextResponse } from "next/server";
import { getAuthCookieName, type SessionRole, verifySessionToken } from "@/lib/auth/session";

type RouteRule = {
  prefix: string;
  roles: SessionRole[];
};

const PAGE_RULES: RouteRule[] = [
  { prefix: "/pos", roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { prefix: "/admin/orders", roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { prefix: "/analytics", roles: ["ADMIN", "MANAGER"] },
  { prefix: "/inventory", roles: ["ADMIN", "MANAGER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/users", roles: ["ADMIN"] },
];

const API_RULES: RouteRule[] = [
  { prefix: "/api/pos", roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { prefix: "/api/sync", roles: ["ADMIN", "MANAGER", "CASHIER"] },
  { prefix: "/api/analytics", roles: ["ADMIN", "MANAGER"] },
  { prefix: "/api/admin", roles: ["ADMIN"] },
  { prefix: "/api/inventory", roles: ["ADMIN", "MANAGER"] },
  { prefix: "/api/products", roles: ["ADMIN", "MANAGER"] },
  { prefix: "/api/users", roles: ["ADMIN"] },
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function findRule(pathname: string, rules: RouteRule[]) {
  return rules.find((rule) => matchesPrefix(pathname, rule.prefix));
}

function clearAuthCookie(response: NextResponse) {
  response.cookies.set(getAuthCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/pos/checkout") {
    return NextResponse.next();
  }

  // Also specifically block regular /orders from unauthenticated users
  if (pathname === "/orders" || pathname.startsWith("/orders/")) {
    const token = request.cookies.get(getAuthCookieName())?.value;
    if (!token) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
    try {
      await verifySessionToken(token);
      return NextResponse.next();
    } catch {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      return clearAuthCookie(NextResponse.redirect(loginUrl));
    }
  }

  const isApi = pathname.startsWith("/api/");
  const matchedRule = isApi ? findRule(pathname, API_RULES) : findRule(pathname, PAGE_RULES);

  if (!matchedRule) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getAuthCookieName())?.value;
  if (!token) {
    if (isApi) {
      return clearAuthCookie(NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 }));
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return clearAuthCookie(NextResponse.redirect(loginUrl));
  }

  let role: SessionRole = "CASHIER";

  try {
    const session = await verifySessionToken(token);
    role = session.role;
  } catch {
    if (isApi) {
      return clearAuthCookie(NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 }));
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return clearAuthCookie(NextResponse.redirect(loginUrl));
  }

  if (matchedRule.roles.includes(role)) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json(
      {
        ok: false,
        error: "FORBIDDEN",
        message: "You are not allowed to access this resource.",
      },
      { status: 403 },
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = role === "ADMIN" || role === "MANAGER" ? "/analytics" : role === "CASHIER" ? "/pos" : "/";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/pos/:path*",
    "/orders/:path*",
    "/admin/:path*",
    "/analytics/:path*",
    "/inventory/:path*",
    "/users/:path*",
    "/api/:path*",
  ],
};

