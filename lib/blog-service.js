import Profile from "@/models/Profile";

/** HTML/text content se approx read-time (minutes, 200 wpm). */
export function estimateReadTime(content = "") {
  const text = String(content).replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Plain-text excerpt from content (jab user ne na diya ho). */
export function deriveExcerpt(content = "", max = 200) {
  const text = String(content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

/**
 * Author display snapshot — User.name + (agar profile hai to) avatar/institution.
 * Blog create time pe call hota hai taaki listing reads me join na karna pade.
 */
export async function authorSnapshot(user) {
  const snap = { name: user.name || "", avatar: "", institution: "" };
  try {
    const profile = await Profile.findOne({ user_id: user._id }).select(
      "avatar_url headline institution"
    );
    if (profile) {
      snap.avatar = profile.avatar_url || "";
      snap.institution = profile.institution || profile.headline || "";
    }
  } catch {
    // profile optional — ignore
  }
  return snap;
}

/** API ke liye safe blog shape — frontend card/reader isi par depend karta hai. */
export function publicBlog(blog, { full = false } = {}) {
  // Helper to extract clean plain text from HTML content
  const cleanContent = String(blog.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If content has actual written body (not empty or just default placeholder), use it
  const isPlaceholder = !cleanContent || cleanContent === "Write your content here";
  const rawText = !isPlaceholder ? cleanContent : (blog.excerpt || "");

  const words = rawText.split(/\s+/).filter(Boolean);
  const preview =
    words.slice(0, 20).join(" ") + (words.length > 20 ? "…" : "");

  const base = {
    id: String(blog._id),
    slug: blog.slug,
    title: blog.title,
    excerpt: blog.excerpt,
    preview,                         // ← always present: ≤20 words for card
    category: blog.category,
    tags: blog.tags || [],
    image: blog.featured_image || "",
    featured_image: blog.featured_image || "",
    is_featured: !!blog.is_featured,
    status: blog.status,
    author: {
      name: blog.author?.name || "",
      avatar: blog.author?.avatar || "",
      institution: blog.author?.institution || "",
    },
    read_time: blog.read_time || 1,
    likes: Array.isArray(blog.likes) ? blog.likes.length : 0,
    comments: blog.comments_count || 0,
    views: blog.views || 0,
    published_at: blog.published_at,
    created_at: blog.createdAt,
    updated_at: blog.updatedAt,
  };
  if (full) {
    base.content = blog.content || "";
    base.seo = blog.seo || {};
    base.plagiarism_score = blog.plagiarism_score ?? null;
  }
  return base;
}
