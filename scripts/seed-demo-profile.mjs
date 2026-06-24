/**
 * Demo profile seed — taaki /profile/vinaytyagi fully-populated dikhe.
 * Usage:  node --env-file=.env scripts/seed-demo-profile.mjs
 */
import mongoose from "mongoose";
import crypto from "crypto";

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "anthroplanet",
});
const db = mongoose.connection.db;

// "User" role ensure + demo user
await db.collection("roles").updateOne(
  { name: "User" },
  { $setOnInsert: { name: "User", is_system_role: true, permissions: {}, createdAt: new Date(), updatedAt: new Date() } },
  { upsert: true }
);
const userRole = await db.collection("roles").findOne({ name: "User" });

const email = "vinaytyagi@anthroplanet.dev";
await db.collection("users").updateOne(
  { email },
  {
    $setOnInsert: {
      name: "Vinay Tyagi",
      email,
      password_hash: "",
      role_ids: [userRole._id],
      is_email_verified: true,
      is_2fa_enabled: false,
      referral_code: crypto.randomBytes(4).toString("hex").toUpperCase(),
      reward_points: 420,
      cumulative_session_count: 0,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  { upsert: true }
);
const user = await db.collection("users").findOne({ email });

const profile = {
  user_id: user._id,
  username: "vinaytyagi",
  display_name: "Vinay Tyagi",
  headline: "Computational Biologist · IIT Delhi",
  institution: "Indian Institute of Technology, Delhi",
  location: "New Delhi, India",
  bio: "PhD candidate working at the intersection of machine learning and genomics. I build models that make sense of high-throughput sequencing data, and I write about open science.",
  avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  research_interests: ["Genomics", "Machine Learning", "Bioinformatics", "Open Science"],
  links: {
    website: "https://vinaytyagi.dev",
    scholar: "https://scholar.google.com",
    orcid: "0000-0002-1825-0097",
    linkedin: "https://linkedin.com/in/vinaytyagi",
    twitter: "https://x.com/vinaytyagi",
  },
  academics: [
    { degree: "Ph.D. Computational Biology", institution: "IIT Delhi", field: "Genomics + ML", year: "2022–present" },
    { degree: "M.Tech. Bioinformatics", institution: "IISc Bangalore", field: "Bioinformatics", year: "2020" },
    { degree: "B.Tech. Biotechnology", institution: "VIT Vellore", field: "Biotechnology", year: "2018" },
  ],
  cv_url: "https://example.com/vinay-tyagi-cv.pdf",
  achievements: [
    { title: "Best Paper Award — ISCB 2024", description: "For work on interpretable variant-effect prediction.", date: "2024", url: "" },
    { title: "DBT Research Fellowship", description: "Department of Biotechnology, Govt. of India.", date: "2023", url: "" },
    { title: "Google PhD Fellowship — Finalist", description: "Machine learning for the life sciences.", date: "2023", url: "" },
  ],
  badges: [
    { name: "Top Author", icon: "✍️", awarded_for: "10+ published blogs" },
    { name: "Mentor", icon: "🎓", awarded_for: "50+ mentoring sessions" },
    { name: "Verified Researcher", icon: "✅", awarded_for: "ORCID verified" },
  ],
  impact: {
    publications: 24,
    citations: 1380,
    h_index: 18,
    i10_index: 21,
    anthroplanet_score: 87,
  },
  projects: [
    { title: "VariantNet", description: "Deep model for variant-effect prediction across populations.", role: "Lead", year: "2024", url: "" },
    { title: "OpenGenome Atlas", description: "Community-curated atlas of annotated genomes.", role: "Maintainer", year: "2023", url: "" },
  ],
  service_offerings: [
    { title: "1:1 Bioinformatics Mentoring", description: "Pipeline design, paper feedback, career guidance.", price_label: "₹1,500 / session" },
    { title: "Manuscript Review", description: "Methods and stats review for genomics papers.", price_label: "₹2,500" },
  ],
  privacy_settings: { overview: true, resume: true, achievements: true, impact: true, work: true },
  is_published: true,
  updatedAt: new Date(),
};

await db.collection("profiles").updateOne(
  { username: "vinaytyagi" },
  { $set: profile, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
);

console.log("✅ Seeded demo profile → http://localhost:3000/profile/vinaytyagi");
await mongoose.disconnect();
