import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * anthro-admin — Central security middleware.
 *
 * Responsibilities:
 *  1. CORS headers   — har response pe CORS headers (preflight + normal)
 *  2. Rate limiting  — auth endpoints pe brute-force rokna (PRD: 5 req/15min/IP)
 *  3. JWT verify     — har protected /api/v1/* route pe token check
 *  4. User inject    — verified user info request headers mein pass karna
 *
 * Flow:
 *  OPTIONS           → 204 with CORS headers (preflight)
 *  Auth routes POST  → rate limit check, then pass
 *  Public routes     → pass through (no token needed)
 *  /api/v1/*         → JWT verify → 401 ya pass with x-user-* headers
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_COOKIE = "ap_access";

const ALLOWED_ORIGINS = [
  process.env.USER_FRONTEND_URL,
  process.env.APP_BASE_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

// Auth endpoints jahan JWT nahi chahiye — apni security khud handle karte hain
const AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

// Public profile read — /api/v1/profile/[username] GET (not /me)
const PUBLIC_PROFILE_RE = /^\/api\/v1\/profile\/(?!me(?:\/|$))[^/]+$/;

// Public blog read — GET /api/v1/blogs (list) and /api/v1/blogs/:idOrSlug (single).
// Mutations (POST/PATCH) and /blogs/:id/submit still go through JWT check below.
const PUBLIC_BLOG_RE = /^\/api\/v1\/blogs(?:\/[^/]+)?$/;

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

/** Build CORS headers based on the request origin. */
function corsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** Attach CORS headers to any NextResponse. */
function withCors(req, res) {
  const ch = corsHeaders(req);
  for (const [k, v] of Object.entries(ch)) res.headers.set(k, v);
  return res;
}

function unauthorizedResponse(req, message = "Authentication required.") {
  const res = NextResponse.json({ error: message }, { status: 401 });
  return withCors(req, res);
}

function rateLimitResponse(req, retryAfterSeconds) {
  const res = NextResponse.json(
    { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.` },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
  return withCors(req, res);
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // 1. OPTIONS — CORS preflight → 204 with CORS headers
  if (method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    return withCors(req, res);
  }

  // 2. Auth endpoints — rate limit POST, then pass through
  const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => pathname === p);
  if (isAuthEndpoint) {
    // abhi k liye rate limit POST disable kiya hai
    /*
    if (method === "POST") {
      const ip = getClientIp(req);
      const { limited, retryAfterSeconds } = checkRateLimit(ip);
      if (limited) return rateLimitResponse(req, retryAfterSeconds);
    }
    */
    const res = NextResponse.next();
    return withCors(req, res);
  }

  // 3. Public profile read — no auth needed
  if (PUBLIC_PROFILE_RE.test(pathname) && method === "GET") {
    const res = NextResponse.next();
    return withCors(req, res);
  }

  // 3b. Public blog read (list + single) — no auth needed for GET
  if (PUBLIC_BLOG_RE.test(pathname) && method === "GET") {
    const res = NextResponse.next();
    return withCors(req, res);
  }

  // 4. All other /api/v1/* routes — JWT required
  if (pathname.startsWith("/api/v1/")) {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return unauthorizedResponse(req, "No session found. Please log in.");
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch (err) {
      const isExpired = err?.code === "ERR_JWT_EXPIRED";
      return unauthorizedResponse(
        req,
        isExpired
          ? "Session expired. Please log in again."
          : "Invalid session token."
      );
    }

    // Token valid — forward user info to route handlers via request headers
    // Route handlers can read these without an extra DB round-trip
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", String(payload.sub));
    requestHeaders.set("x-user-email", String(payload.email || ""));
    requestHeaders.set("x-user-roles", JSON.stringify(payload.roles || []));

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return withCors(req, res);
  }

  const res = NextResponse.next();
  return withCors(req, res);
}

export const config = {
  matcher: [
    // All API routes
    "/api/v1/:path*",
  ],
};
