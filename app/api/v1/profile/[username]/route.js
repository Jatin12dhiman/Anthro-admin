import { dbConnect } from "@/lib/db";
import Profile from "@/models/Profile";
import { json, preflight } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth-service";
import { applyPrivacy } from "@/lib/profile-service";

export async function OPTIONS(req) {
  return preflight(req);
}

// Public profile — privacy-aware. Owner sab dekhe, baaki sirf public sections.
export async function GET(req, ctx) {
  try {
    const { username } = await ctx.params;
    await dbConnect();

    const p = await Profile.findOne({
      username: String(username).toLowerCase(),
    }).populate("user_id", "name status email");

    // Bug Fix: Check !p.user_id to prevent crash if user is deleted but profile exists
    if (!p || !p.is_published || !p.user_id || p.user_id.status === "banned") {
      return json(req, { error: "Profile not found" }, { status: 404 });
    }

    let viewer = null;
    try {
      viewer = await getCurrentUser(req);
    } catch {
      viewer = null;
    }
    const isOwner = !!viewer && String(viewer._id) === String(p.user_id._id);

    const obj = p.toObject();
    obj.display_name = obj.display_name || p.user_id?.name || "";
    obj.email = p.user_id?.email || "";
    delete obj.__v;
    delete obj.subscription_plan_id;

    const { profile, hidden } = applyPrivacy(obj, isOwner);
    return json(req, { profile, isOwner, hidden });
  } catch (err) {
    console.error("profile get error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
