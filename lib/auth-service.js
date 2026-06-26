import Role from "@/models/Role";
import User from "@/models/User";
import { dbConnect } from "@/lib/db";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from "@/lib/jwt";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
} from "@/lib/http";

const ACCESS_MAX_AGE = 15 * 60; // 15m
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7d

/** Default system roles — idempotent upsert (register pe ensure hote hain). */
export async function ensureSystemRoles() {
  const defaults = [
    {
      name: "Super Admin",
      description: "Full platform access — users, roles, revenue, settings.",
      is_system_role: true,
      permissions: { all: ["*"] },
    },
    {
      name: "User",
      description: "Standard subscriber — publish, profile, services.",
      is_system_role: true,
      permissions: {
        blog: ["read", "create"],
        profile: ["read", "update"],
        mentoring: ["read", "book"],
      },
    },
  ];
  for (const r of defaults) {
    await Role.updateOne({ name: r.name }, { $setOnInsert: r }, { upsert: true });
  }
}

export async function defaultRoleForNewUser() {
  // Always return standard 'User' role for database users since Admin is env-only
  return Role.findOne({ name: "User" });
}

/** API ke liye safe user shape — password_hash kabhi nahi. */
export function publicUser(user) {
  let roles = (user.role_ids || []).map((r) => (r && r.name ? r.name : String(r)));

  // Decoupled Admin safety: database users cannot have admin roles.
  if (String(user._id) !== "000000000000000000000000") {
    roles = roles.filter((r) => r !== "Super Admin" && r !== "Admin");
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles,
    reward_points: user.reward_points,
    referral_code: user.referral_code,
    is_2fa_enabled: user.is_2fa_enabled,
    is_email_verified: user.is_email_verified,
    status: user.status,
  };
}

/** Access + refresh JWT cookies set karta hai response pe. */
export function setSessionCookies(res, user) {
  // roles bhi payload mein — middleware DB hit kiye bina basic RBAC check kar sake
  let roles = (user.role_ids || [])
    .map((r) => (r && r.name ? r.name : null))
    .filter(Boolean);

  // Decoupled Admin safety: database users cannot have admin roles.
  if (String(user._id) !== "000000000000000000000000") {
    roles = roles.filter((r) => r !== "Super Admin" && r !== "Admin");
  }

  const payload = {
    sub: String(user._id),
    email: user.email,
    roles,
  };

  res.cookies.set(ACCESS_COOKIE, signAccessToken(payload), cookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(REFRESH_COOKIE, signRefreshToken(payload), cookieOptions(REFRESH_MAX_AGE));
}

/** Logout — cookies clear. */
export function clearSessionCookies(res) {
  res.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  res.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

/**
 * Request ki access-cookie se current user nikaalta hai (verify + DB lookup).
 * null = not authenticated. /me aur RBAC guards yahi use karte hain.
 */
export async function getCurrentUser(req) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  // Check env-only Admin bypass (skip DB query)
  if (process.env.ADMIN_EMAIL && payload.email === process.env.ADMIN_EMAIL) {
    return {
      _id: "000000000000000000000000",
      name: "System Admin",
      email: process.env.ADMIN_EMAIL,
      role_ids: [{ name: "Super Admin", permissions: { all: ["*"] } }],
      status: "active",
    };
  }

  await dbConnect();
  const user = await User.findById(payload.sub).populate("role_ids", "name permissions");
  if (!user || user.status === "banned") return null;

  // Decoupled Admin safety: database users cannot have admin roles.
  if (user.role_ids) {
    user.role_ids = user.role_ids.filter(
      (r) => r.name !== "Super Admin" && r.name !== "Admin"
    );
  }

  return user;
}
