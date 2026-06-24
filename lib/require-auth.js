import { getCurrentUser } from "@/lib/auth-service";
import { json } from "@/lib/http";

/**
 * Route handler auth/RBAC helpers.
 *
 * Middleware already JWT verify kar chuka hai.
 * Yeh helpers DB se full user fetch karte hain — agar banned/suspended
 * check, ya fine-grained permissions chahiye.
 *
 * Usage in route handler:
 *
 *   const { user, fail } = await requireAuth(req);
 *   if (fail) return fail;
 *   // user is now the full Mongoose doc
 *
 *   const { user, fail } = await requireRole(req, "Super Admin");
 *   if (fail) return fail;
 *
 *   const { user, fail } = await requirePermission(req, "blog", "create");
 *   if (fail) return fail;
 */

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Verifies auth and returns the full DB user.
 * Returns { user, fail: null } on success, { user: null, fail: Response } on failure.
 */
export async function requireAuth(req) {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      user: null,
      fail: json(req, { error: "Authentication required." }, { status: 401 }),
    };
  }
  return { user, fail: null };
}

// ─── requireRole ─────────────────────────────────────────────────────────────

/**
 * Checks that the authenticated user has at least one of the given roles.
 *
 * @param {Request} req
 * @param {...string} roles  e.g. "Super Admin", "Admin", "Editor"
 */
export async function requireRole(req, ...roles) {
  const { user, fail } = await requireAuth(req);
  if (fail) return { user: null, fail };

  const userRoles = (user.role_ids || [])
    .map((r) => r?.name)
    .filter(Boolean);

  const hasRole = roles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    return {
      user: null,
      fail: json(
        req,
        { error: "You don't have permission to perform this action." },
        { status: 403 }
      ),
    };
  }

  return { user, fail: null };
}

// ─── requirePermission ───────────────────────────────────────────────────────

/**
 * Fine-grained RBAC — checks module + action from DB roles.
 *
 * Role permissions shape: { blog: ["read","create"], profile: ["*"], all: ["*"] }
 *
 * @param {Request} req
 * @param {string}  module  e.g. "blog", "profile", "mentoring"
 * @param {string}  action  e.g. "read", "create", "update", "delete"
 */
export async function requirePermission(req, module, action) {
  const { user, fail } = await requireAuth(req);
  if (fail) return { user: null, fail };

  const roles = user.role_ids || [];

  // Super Admin — wildcard, allow everything
  const isSuperAdmin = roles.some((r) => {
    const perms = r?.permissions || {};
    return perms.all?.includes("*");
  });
  if (isSuperAdmin) return { user, fail: null };

  // Module-level check
  const hasPermission = roles.some((r) => {
    const perms = r?.permissions || {};
    const modulePerms = perms[module] || [];
    return (
      modulePerms.includes(action) ||
      modulePerms.includes("*") // wildcard on module
    );
  });

  if (!hasPermission) {
    return {
      user: null,
      fail: json(
        req,
        { error: `Permission denied: ${module}:${action}` },
        { status: 403 }
      ),
    };
  }

  return { user, fail: null };
}
