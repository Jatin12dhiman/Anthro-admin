import mongoose from "mongoose";
import crypto from "crypto";

/* =========================
   CONSTANTS
========================= */

export const BLOG_CATEGORIES = [
  "Research",
  "Opinion",
  "Tutorial",
  "Review",
  "Case Study",
];

export const BLOG_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "published",
  "revision_requested",
  "rejected",
];

/* =========================
   REVISION SCHEMA
========================= */

const RevisionSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      trim: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: BLOG_STATUSES,
    },
  },
  { _id: false }
);

/* =========================
   BLOG SCHEMA
========================= */

const BlogSchema = new mongoose.Schema(
  {
    /* -------- BASIC INFO -------- */

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    excerpt: {
      type: String,
      trim: true,
      maxlength: 400,
      default: "",
    },

    content: {
      type: String, // TipTap HTML / JSON string
      default: "",
    },

    /* -------- AUTHOR -------- */

    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    author: {
      name: { type: String, default: "" },
      avatar: { type: String, default: "" },
      institution: { type: String, default: "" },
    },

    /* -------- CLASSIFICATION -------- */

    category: {
      type: String,
      enum: BLOG_CATEGORIES,
      default: "Research",
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      index: true,
    },

    /* -------- MEDIA -------- */

    featured_image: {
      type: String, // S3 URL / key
      default: "",
    },

    is_featured: {
      type: Boolean,
      default: false,
    },

    /* -------- WORKFLOW -------- */

    status: {
      type: String,
      enum: BLOG_STATUSES,
      default: "draft",
      index: true,
    },

    plagiarism_score: {
      type: Number,
      default: null,
    },

    editor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revision_history: {
      type: [RevisionSchema],
      default: [],
    },

    /* -------- SEO -------- */

    seo: {
      meta_description: {
        type: String,
        maxlength: 320,
        default: "",
      },
      og_image: {
        type: String,
        default: "",
      },
    },

    /* -------- ENGAGEMENT -------- */

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    views: {
      type: Number,
      default: 0,
    },

    comments_count: {
      type: Number,
      default: 0,
    },

    /* -------- META -------- */

    read_time: {
      type: Number,
      default: 1,
    },

    published_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
   INDEXES
========================= */

// Full-text search
BlogSchema.index({
  title: "text",
  excerpt: "text",
  tags: "text",
});

// Listing optimization
BlogSchema.index({
  status: 1,
  published_at: -1,
});

/* =========================
   SLUG GENERATOR
========================= */

export function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/* =========================
   HOOKS
========================= */

BlogSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    const base = slugify(this.title) || "post";
    const suffix = crypto.randomBytes(3).toString("hex");
    this.slug = `${base}-${suffix}`;
  }
});

/* =========================
   EXPORT
========================= */

export default mongoose.models.Blog ||
  mongoose.model("Blog", BlogSchema);