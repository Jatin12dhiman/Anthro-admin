import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyRefreshToken } from "@/lib/jwt";
import { json, preflight, REFRESH_COOKIE } from "@/lib/http";
import { publicUser, setSessionCookies, clearSessionCookies } from "@/lib/auth-service";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function POST(req) {
  try {
    const token = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!token) {
      return json(req, { error: "No refresh token" }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      const res = json(req, { error: "Invalid refresh token" }, { status: 401 });
      clearSessionCookies(res);
      return res;
    }

    await dbConnect();
    const user = await User.findById(payload.sub).populate("role_ids", "name permissions");
    if (!user || user.status === "banned") {
      const res = json(req, { error: "User unavailable" }, { status: 401 });
      clearSessionCookies(res);
      return res;
    }

    const res = json(req, { user: publicUser(user) });
    setSessionCookies(res, user); // rotate both tokens
    return res;
  } catch (err) {
    console.error("refresh error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
