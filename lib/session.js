import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyAccessToken } from "@/lib/jwt";
import { ACCESS_COOKIE } from "@/lib/http";

/**
 * Server-side session helper (Server Components / layouts ke liye).
 * Access-cookie verify karke DB se user laata hai. null = not authenticated.
 */
export async function getServerUser() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
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

export function roleNames(user) {
  return (user?.role_ids || []).map((r) => r?.name).filter(Boolean);
}

export function isAdmin(user) {
  const names = roleNames(user);
  return names.includes("Super Admin") || names.includes("Admin");
}
