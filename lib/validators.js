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
