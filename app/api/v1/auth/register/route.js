import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validators";
import { json, preflight } from "@/lib/http";
import {
  ensureSystemRoles,
  defaultRoleForNewUser,
  publicUser,
  setSessionCookies,
} from "@/lib/auth-service";

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

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        req,
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await dbConnect();
    const { name, email, password } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) {
      return json(req, { error: "Email already registered" }, { status: 409 });
    }

    await ensureSystemRoles();
    const role = await defaultRoleForNewUser();

    const password_hash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password_hash,
      role_ids: role ? [role._id] : [],
      last_login_at: new Date(),
    });
    await user.populate("role_ids", "name permissions");

    const res = json(req, { user: publicUser(user) }, { status: 201 });
    setSessionCookies(res, user);
    return res;
  } catch (err) {
    console.error("register error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
