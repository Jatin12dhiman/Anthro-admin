import { json, preflight } from "@/lib/http";
import { getCurrentUser, publicUser } from "@/lib/auth-service";
import { dbConnect } from "@/lib/db";
import Profile from "@/models/Profile";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function GET(req) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return json(req, { error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const profile = await Profile.findOne({ user_id: user._id }).select("username").lean();

    return json(req, {
      user: {
        ...publicUser(user),
        profile_username: profile?.username || null,
      },
    });
  } catch (err) {
    console.error("me error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
