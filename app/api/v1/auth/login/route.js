import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { comparePassword } from "@/lib/password";
import { loginSchema } from "@/lib/validators";
import { json, preflight } from "@/lib/http";
import { publicUser, setSessionCookies } from "@/lib/auth-service";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return json(req, { error: "Invalid email or password" }, { status: 400 });
    }

    await dbConnect();
    const { email, password } = parsed.data;

    // Check env-only Admin bypass
    if (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      if (password === process.env.ADMIN_PASSWORD) {
        const adminUser = {
          _id: "000000000000000000000000", // Fixed deterministic admin ID
          name: "System Admin",
          email: process.env.ADMIN_EMAIL,
          role_ids: [{ name: "Super Admin", permissions: { all: ["*"] } }],
          status: "active",
        };
        const res = json(req, { user: publicUser(adminUser) });
        setSessionCookies(res, adminUser);
        return res;
      } else {
        return json(req, { error: "Invalid email or password" }, { status: 401 });
      }
    }

    // password_hash select:false hai — explicitly maango.
    const user = await User.findOne({ email })
      .select("+password_hash")
      .populate("role_ids", "name permissions");

    if (!user || !(await comparePassword(password, user.password_hash))) {
      // Same message dono cases ke liye — user enumeration se bachne ke liye.
      return json(req, { error: "Invalid email or password" }, { status: 401 });
    }

    // Decoupled Admin safety: database users cannot have admin roles.
    const roles = (user.role_ids || []).map((r) => r?.name).filter(Boolean);
    const hasAdminRole = roles.some((r) => r === "Super Admin" || r === "Admin");
    if (hasAdminRole) {
      return json(req, { error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "banned" || user.status === "suspended") {
      return json(req, { error: `Account ${user.status}` }, { status: 403 });
    }

    user.last_login_at = new Date();
    await user.save();

    const res = json(req, { user: publicUser(user) });
    setSessionCookies(res, user);
    return res;
  } catch (err) {
    console.error("login error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
