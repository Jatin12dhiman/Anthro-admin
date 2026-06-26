import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Blog from "@/models/Blog";
import { json, preflight } from "@/lib/http";
import { requireAuth } from "@/lib/require-auth";
import { publicBlog } from "@/lib/blog-service";

export async function OPTIONS(req) {
  return preflight(req);
}

// ─── POST /api/v1/blogs/:id/submit ───────────────────────────────────────────
// Author draft ko review ke liye submit kare: draft|revision_requested → submitted.
export async function POST(req, ctx) {
  try {
    const { user, fail } = await requireAuth(req);
    if (fail) return fail;

    const { id } = await ctx.params;
    await dbConnect();

    const blog = mongoose.isValidObjectId(id)
      ? await Blog.findById(id)
      : await Blog.findOne({ slug: id });

    if (!blog) return json(req, { error: "Blog not found" }, { status: 404 });

    if (String(blog.author_id) !== String(user._id)) {
      return json(req, { error: "You can only submit your own blog." }, { status: 403 });
    }

    if (!["draft", "revision_requested"].includes(blog.status)) {
      return json(
        req,
        { error: `Blog already ${blog.status} — can't submit again.` },
        { status: 409 }
      );
    }

    if (!blog.title?.trim() || !blog.content?.trim()) {
      return json(
        req,
        { error: "Add a title and some content before submitting." },
        { status: 400 }
      );
    }

    blog.status = "submitted";
    blog.revision_history.push({ status: "submitted", by: user._id, at: new Date() });
    await blog.save();

    return json(req, { blog: publicBlog(blog, { full: true }) });
  } catch (err) {
    console.error("blog submit error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
