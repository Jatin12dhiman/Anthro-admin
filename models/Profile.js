import mongoose from "mongoose";

/**
 * Profile — PRD `profiles` collection (Module 4, multi-tenant SaaS).
 * Har user ka ek public profile page (/profile/:username). Sections tab-wise
 * organize hote hain; har tab ka apna privacy flag (Public/Private).
 *
 * Multi-tenant rule: har query `user_id` se scope hoti hai (data leak na ho).
 */
const AcademicSchema = new mongoose.Schema(
  { degree: String, institution: String, field: String, year: String },
  { _id: false }
);
const AchievementSchema = new mongoose.Schema(
  { title: String, description: String, date: String, url: String },
  { _id: false }
);
const BadgeSchema = new mongoose.Schema(
  { name: String, icon: String, awarded_for: String },
  { _id: false }
);
const ServiceSchema = new mongoose.Schema(
  { title: String, description: String, price_label: String },
  { _id: false }
);
const ProjectSchema = new mongoose.Schema(
  { title: String, description: String, role: String, year: String, url: String },
  { _id: false }
);

const ProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    // Overview
    display_name: { type: String, default: "" },
    headline: { type: String, default: "" }, // "Researcher · IIT Delhi"
    institution: { type: String, default: "" },
    location: { type: String, default: "" },
    bio: { type: String, default: "" },
    avatar_url: { type: String, default: "" },
    research_interests: { type: [String], default: [] },
    links: {
      website: String,
      scholar: String,
      orcid: String,
      linkedin: String,
      twitter: String,
    },

    // Résumé
    academics: { type: [AcademicSchema], default: [] },
    cv_url: { type: String, default: "" },

    // Achievements
    achievements: { type: [AchievementSchema], default: [] }, // Wait, let's keep it consistent: PRD schemas or properties
    badges: { type: [BadgeSchema], default: [] },

    // Impact (Altmetrics + custom Anthroplanet Score)
    impact: {
      publications: { type: Number, default: 0 },
      citations: { type: Number, default: 0 },
      h_index: { type: Number, default: 0 },
      i10_index: { type: Number, default: 0 },
      anthroplanet_score: { type: Number, default: 0 },
    },

    // Work
    projects: { type: [ProjectSchema], default: [] },
    service_offerings: { type: [ServiceSchema], default: [] },

    // Per-tab privacy — true = public, false = private (sirf owner dekhe)
    privacy_settings: {
      overview: { type: Boolean, default: true },
      resume: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      impact: { type: Boolean, default: true },
      work: { type: Boolean, default: true },
    },

    subscription_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan" },
    is_published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Profile || mongoose.model("Profile", ProfileSchema);
