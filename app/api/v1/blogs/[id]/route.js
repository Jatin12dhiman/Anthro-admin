import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Blog from "@/models/Blog";
import { json, preflight } from "@/lib/http";
import { requireAuth } from "@/lib/require-auth";
import { getCurrentUser } from "@/lib/auth-service";
import { blogUpdateSchema } from "@/lib/validators";
import { publicBlog, estimateReadTime, deriveExcerpt } from "@/lib/blog-service";

export async function OPTIONS(req) {
  return preflight(req);
}

/** `:id` slug ya ObjectId dono ho sakta hai — dono resolve karo. */
async function findBlog(idOrSlug) {
  let blog = await Blog.findOne({ slug: idOrSlug });
  if (!blog && mongoose.isValidObjectId(idOrSlug)) {
    blog = await Blog.findById(idOrSlug);
  }
  return blog;
}

// ─── GET /api/v1/blogs/:idOrSlug ─────────────────────────────────────────────
// Published → public. Draft/non-published → sirf owner.
export async function GET(req, ctx) {
  try {
    const { id } = await ctx.params;
    await dbConnect();

    const blog = await findBlog(id);
    if (!blog) return json(req, { error: "Blog not found" }, { status: 404 });

    if (blog.status !== "published") {
      let viewer = null;
      try {
        viewer = await getCurrentUser(req);
      } catch {
        viewer = null;
      }
      const isOwner = !!viewer && String(viewer._id) === String(blog.author_id);
      if (!isOwner) return json(req, { error: "Blog not found" }, { status: 404 });
    } else {
      // Published read → view count badhao (best-effort, response block na kare).
      Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).catch(() => {});
    }

    return json(req, { blog: publicBlog(blog, { full: true }) });
  } catch (err) {
    console.error("blog get error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/v1/blogs/:id ─────────────────────────────────────────────────
// Update / auto-save (owner only). Sirf draft ya revision_requested edit ho sakta.
export async function PATCH(req, ctx) {
  try {
    const { user, fail } = await requireAuth(req);
    if (fail) return fail;

    const { id } = await ctx.params;
    await dbConnect();

    const blog = await findBlog(id);
    if (!blog) return json(req, { error: "Blog not found" }, { status: 404 });

    if (String(blog.author_id) !== String(user._id)) {
      return json(req, { error: "You can only edit your own blog." }, { status: 403 });
    }

    if (!["draft", "revision_requested"].includes(blog.status)) {
      return json(
        req,
        { error: `Cannot edit a blog that is "${blog.status}".` },
        { status: 409 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = blogUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        req,
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const fields = ["title", "excerpt", "content", "category", "tags", "featured_image", "seo"];
    for (const f of fields) {
      if (data[f] !== undefined) blog[f] = data[f];
    }

    if (data.content !== undefined) {
      blog.read_time = estimateReadTime(data.content);
      // Always re-derive excerpt from latest content unless user explicitly sent one
      if (data.excerpt === undefined || data.excerpt === null || data.excerpt.trim() === "") {
        blog.excerpt = deriveExcerpt(data.content);
      }
    }

    await blog.save();
    return json(req, { blog: publicBlog(blog, { full: true }) });
  } catch (err) {
    console.error("blog update error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
