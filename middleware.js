import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * anthro-admin — Central security middleware.
 *
 * Responsibilities:
 *  1. Rate limiting  — auth endpoints pe brute-force rokna (PRD: 5 req/15min/IP)
 *  2. JWT verify     — har protected /api/v1/* route pe token check
 *  3. User inject    — verified user info request headers mein pass karna
 *
 * Flow:
 *  OPTIONS           → pass through (CORS preflight)
 *  Auth routes POST  → rate limit check, then pass
 *  Public routes     → pass through (no token needed)
 *  /api/v1/*         → JWT verify → 401 ya pass with x-user-* headers
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_COOKIE = "ap_access";

// Auth endpoints jahan JWT nahi chahiye — apni security khud handle karte hain
const AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

// Public profile read — /api/v1/profile/[username] GET (not /me)
const PUBLIC_PROFILE_RE = /^\/api\/v1\/profile\/(?!me(?:\/|$))[^/]+$/;

// ─── Rate Limiter (in-memory) ─────────────────────────────────────────────────
//
// PRD: max 5 failed attempts / 15 min / IP on auth routes.
// ⚠️  In-memory = single process only. Production pe Redis use karo
//     (e.g. Upstash @upstash/ratelimit). Abhi dev/demo ke liye sahi hai.

const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** @type {Map<string, {count: number, resetAt: number}>} */
const ipHitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = ipHitMap.get(ip);

  if (!rec || now > rec.resetAt) {
    // Fresh window
    ipHitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }

  if (rec.count >= RATE_LIMIT_COUNT) {
    const retryAfterSeconds = Math.ceil((rec.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  rec.count += 1;
  return { limited: false };
}

function getClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ─── JWT Verify ───────────────────────────────────────────────────────────────

async function verifyToken(token) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET missing");
  const encoded = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, encoded);
  return payload;
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function unauthorizedResponse(message = "Authentication required.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function rateLimitResponse(retryAfterSeconds) {
  return NextResponse.json(
    { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.` },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // 1. OPTIONS — CORS preflight, always allow
  if (method === "OPTIONS") {
    return NextResponse.next();
  }

  // 2. Auth endpoints — rate limit POST, then pass through
  const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => pathname === p);
  if (isAuthEndpoint) {
    // abhi k liye rate limit POST disable kiya hai
    /*
    if (method === "POST") {
      const ip = getClientIp(req);
      const { limited, retryAfterSeconds } = checkRateLimit(ip);
      if (limited) return rateLimitResponse(retryAfterSeconds);
    }
    */
    return NextResponse.next();
  }

  // 3. Public profile read — no auth needed
  if (PUBLIC_PROFILE_RE.test(pathname) && method === "GET") {
    return NextResponse.next();
  }

  // 4. All other /api/v1/* routes — JWT required
  if (pathname.startsWith("/api/v1/")) {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return unauthorizedResponse("No session found. Please log in.");
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch (err) {
      const isExpired = err?.code === "ERR_JWT_EXPIRED";
      return unauthorizedResponse(
        isExpired
          ? "Session expired. Please log in again."
          : "Invalid session token."
      );
    }

    // Token valid — forward user info to route handlers via headers
    // Route handlers can read these without an extra DB round-trip
    const res = NextResponse.next();
    res.headers.set("x-user-id", String(payload.sub));
    res.headers.set("x-user-email", String(payload.email || ""));
    res.headers.set("x-user-roles", JSON.stringify(payload.roles || []));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // All API routes
    "/api/v1/:path*",
  ],
};
