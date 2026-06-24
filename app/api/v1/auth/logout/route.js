import { json, preflight } from "@/lib/http";
import { clearSessionCookies } from "@/lib/auth-service";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function POST(req) {
  const res = json(req, { ok: true });
  clearSessionCookies(res);
  return res;
}
