import { z } from "zod";

/** Zod input schemas — har auth route input validate karta hai. */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

// ─── Blogging (SOW 3.2) ──────────────────────────────────────────────────────

const BLOG_CATEGORIES = ["Research", "Opinion", "Tutorial", "Review", "Case Study"];

/** Create a new draft — sirf title zaroori, baaki optional (draft hai). */
export const blogCreateSchema = z.object({
  title: z.string().trim().min(3, "Title too short").max(180),
  excerpt: z.string().trim().max(400).optional(),
  content: z.string().optional(),
  category: z.enum(BLOG_CATEGORIES).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  featured_image: z.string().trim().optional(),
  seo: z
    .object({
      meta_description: z.string().trim().max(320).optional(),
      og_image: z.string().trim().optional(),
    })
    .optional(),
});

/** Update / auto-save — sab fields optional (partial). */
export const blogUpdateSchema = blogCreateSchema.partial();
