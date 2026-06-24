import Profile from "@/models/Profile";

/** 5 profile tabs → kaunse fields un par dikhte hain (privacy strip ke liye). */
export const TAB_FIELDS = {
  overview: ["bio", "research_interests", "links"],
  resume: ["academics", "cv_url"],
  achievements: ["achievements", "badges"],
  impact: ["impact"],
  work: ["projects", "service_offerings"],
};

/** Email/name se ek unique URL-safe username banao. */
export async function uniqueUsername(base) {
  const slug =
    (base || "user")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // spaces to dashes
      .replace(/[^a-z0-9-]/g, "") // keep lowercase alphanumeric and dashes
      .replace(/-+/g, "-") // squash duplicate dashes
      .replace(/^-+|-+$/g, "") // trim leading/trailing dashes
      .slice(0, 25) || "user";
  let candidate = slug;
  let i = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await Profile.exists({ username: candidate })) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

/** Owner ka profile laao; na ho to blank bana do (lazy create). */
export async function getOrCreateProfile(user) {
  let p = await Profile.findOne({ user_id: user._id });
  if (!p) {
    const username = await uniqueUsername(user.name || user.email.split("@")[0]);
    p = await Profile.create({
      user_id: user._id,
      username,
      display_name: user.name,
    });
  }
  return p;
}

/**
 * Non-owner ke liye private tabs ke fields hata do (server-side enforce —
 * private data kabhi wire pe nahi jaata). `hidden` = locked tabs ki list.
 */
export function applyPrivacy(profileObj, isOwner) {
  const priv = profileObj.privacy_settings || {};
  const hidden = [];
  if (!isOwner) {
    for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
      if (priv[tab] === false) {
        hidden.push(tab);
        for (const f of fields) delete profileObj[f];
      }
    }
  }
  return { profile: profileObj, hidden };
}
