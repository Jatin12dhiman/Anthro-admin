import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import Blog from "@/models/Blog";
import { json, preflight } from "@/lib/http";
import { requireAuth } from "@/lib/require-auth";
import { blogCreateSchema } from "@/lib/validators";
import {
  publicBlog,
  estimateReadTime,
  deriveExcerpt,
  authorSnapshot,
} from "@/lib/blog-service";

export async function OPTIONS(req) {
  return preflight(req);
}

// ─── GET /api/v1/blogs ───────────────────────────────────────────────────────
// Public listing (published) + filters/search/pagination (SOW 3.2).
// `?mine=true` (auth) → current user ke apne blogs (any status) — author dashboard.
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const mine = searchParams.get("mine") === "true";
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const author = searchParams.get("author");
    const q = (searchParams.get("q") || "").trim();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "9", 10) || 9));
    const skip = (page - 1) * limit;

    const filter = {};

    if (mine) {
      const { user, fail } = await requireAuth(req);
      if (fail) return fail;
      filter.author_id = user._id;
    } else {
      filter.status = "published";
    }

    if (category && category !== "All") filter.category = category;
    if (tag) filter.tags = tag;
    if (author) {
      if (mongoose.isValidObjectId(author)) {
        filter.author_id = author;
      } else {
        return json(req, {
          blogs: [],
          page,
          limit,
          total: 0,
          total_pages: 1,
        });
      }
    }
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
        { excerpt: { $regex: q, $options: "i" } },
      ];
    }

    // Published list recency se; apne drafts latest-edited pehle.
    const sort = mine ? { updatedAt: -1 } : { published_at: -1, createdAt: -1 };

    const [docs, total] = await Promise.all([
      Blog.find(filter).sort(sort).skip(skip).limit(limit),
      Blog.countDocuments(filter),
    ]);

    return json(req, {
      blogs: docs.map((b) => publicBlog(b)),
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error("blogs list error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/v1/blogs ──────────────────────────────────────────────────────
// Naya draft create (auth).
export async function POST(req) {
  try {
    const { user, fail } = await requireAuth(req);
    if (fail) return fail;

    let body;
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = blogCreateSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        req,
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await dbConnect();
    const data = parsed.data;

    const content = data.content || "";
    const blog = await Blog.create({
      title: data.title,
      excerpt: data.excerpt || deriveExcerpt(content),
      content,
      category: data.category || "Research",
      tags: data.tags || [],
      featured_image: data.featured_image || "",
      seo: data.seo || {},
      author_id: user._id,
      author: await authorSnapshot(user),
      read_time: estimateReadTime(content),
      status: "draft",
    });

    return json(req, { blog: publicBlog(blog, { full: true }) }, { status: 201 });
  } catch (err) {
    console.error("blog create error:", err);
    return json(req, { error: "Server error" }, { status: 500 });
  }
}
