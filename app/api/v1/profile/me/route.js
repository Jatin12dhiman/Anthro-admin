import { dbConnect } from "@/lib/db";
import { json, preflight } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth-service";
import { getOrCreateProfile } from "@/lib/profile-service";

const EDITABLE = [
  "display_name",
  "headline",
  "institution",
  "location",
  "bio",
  "avatar_url",
  "research_interests",
  "links",
  "academics",
  "cv_url",
  "achievements",
  "badges",
  "impact",
  "projects",
  "service_offerings",
  "privacy_settings",
  "is_published",
];

export async function OPTIONS(req) {
  return preflight(req);
}

// Owner ka apna profile (na ho to lazy-create).
export async function GET(req) {
  const user = await getCurrentUser(req);
  if (!user) return json(req, { error: "Not authenticated" }, { status: 401 });

  await dbConnect();
  const p = await getOrCreateProfile(user);
  const obj = p.toObject();
  obj.email = user.email || "";
  return json(req, { profile: obj });
}

// Owner apne fields update kare (whitelist only).
export async function PUT(req) {
  const user = await getCurrentUser(req);
  if (!user) return json(req, { error: "Not authenticated" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, { status: 400 });
  }

  await dbConnect();
  const p = await getOrCreateProfile(user);

  // Validate and update username if provided
  if ("username" in body) {
    const rawUsername = String(body.username)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!rawUsername) {
      return json(req, { error: "Username cannot be empty" }, { status: 400 });
    }

    // Check if another profile is using this username
    const exists = await Profile.findOne({ username: rawUsername, user_id: { $ne: user._id } });
    if (exists) {
      return json(req, { error: "Username is already taken" }, { status: 400 });
    }

    p.username = rawUsername;
  }

  for (const key of EDITABLE) {
    if (key in body) p[key] = body[key];
  }
  await p.save();
  const obj = p.toObject();
  obj.email = user.email || "";
  return json(req, { profile: obj });
}
