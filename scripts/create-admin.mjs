/**
 * Super Admin account banane ki CLI utility.
 *
 * Usage (anthro-admin folder se):
 *   node --env-file=.env scripts/create-admin.mjs <email> <password> "<name>"
 *
 * Example:
 *   node --env-file=.env scripts/create-admin.mjs admin@anthroplanet.com Secret123 "Jatin"
 *
 * Agar user already exist karta hai to usse Super Admin role assign kar deta hai.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const [email, password, name = "Admin"] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node --env-file=.env scripts/create-admin.mjs <email> <password> "<name>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "anthroplanet",
});

const db = mongoose.connection.db;
const roles = db.collection("roles");
const users = db.collection("users");

// Super Admin role ensure
await roles.updateOne(
  { name: "Super Admin" },
  {
    $setOnInsert: {
      name: "Super Admin",
      description: "Full platform access — users, roles, revenue, settings.",
      is_system_role: true,
      permissions: { all: ["*"] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  { upsert: true }
);
const superAdmin = await roles.findOne({ name: "Super Admin" });

const cost = parseInt(process.env.BCRYPT_COST || "12", 10);
const password_hash = await bcrypt.hash(password, cost);
const lowerEmail = email.toLowerCase().trim();

const existing = await users.findOne({ email: lowerEmail });
if (existing) {
  await users.updateOne(
    { _id: existing._id },
    {
      $set: { password_hash, updatedAt: new Date() },
      $addToSet: { role_ids: superAdmin._id },
    }
  );
  console.log(`✅ Updated existing user "${lowerEmail}" → Super Admin (password reset).`);
} else {
  await users.insertOne({
    name,
    email: lowerEmail,
    password_hash,
    role_ids: [superAdmin._id],
    is_email_verified: true,
    is_2fa_enabled: false,
    referral_code: crypto.randomBytes(4).toString("hex").toUpperCase(),
    reward_points: 0,
    cumulative_session_count: 0,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✅ Created Super Admin "${lowerEmail}".`);
}

console.log("→ Login at http://localhost:3001/admin/login");
await mongoose.disconnect();
