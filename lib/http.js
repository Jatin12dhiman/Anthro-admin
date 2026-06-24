import { NextResponse } from "next/server";

/**
 * HTTP helpers — CORS + JSON responses + auth cookie config.
 *
 * Frontend (localhost:3000) cross-origin se admin-backend (localhost:3001)
 * ki API call karta hai with credentials, isliye har response pe CORS headers
 * chahiye (Allow-Credentials + reflected origin), aur preflight OPTIONS handle.
 */

export const ACCESS_COOKIE = "ap_access";
export const REFRESH_COOKIE = "ap_refresh";

const ALLOWED_ORIGINS = [
  process.env.USER_FRONTEND_URL,
  process.env.APP_BASE_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);

function corsHeaders(req) {
  const origin = req.headers.get("origin");
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

/** JSON response with CORS headers attached. */
export function json(req, data, init = {}) {
  const res = NextResponse.json(data, { status: init.status || 200 });
  const ch = corsHeaders(req);
  for (const [k, v] of Object.entries(ch)) res.headers.set(k, v);
  return res;
}

/** Preflight handler — export as OPTIONS in each route. */
export function preflight(req) {
  const res = new NextResponse(null, { status: 204 });
  const ch = corsHeaders(req);
  for (const [k, v] of Object.entries(ch)) res.headers.set(k, v);
  return res;
}

/** httpOnly cookie options. secure only in production (HTTPS). */
export function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
