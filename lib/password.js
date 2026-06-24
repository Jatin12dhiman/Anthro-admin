import bcrypt from "bcryptjs";

/** bcrypt hash/compare. Cost factor .env se (PRD: min 12). */
const COST = parseInt(process.env.BCRYPT_COST || "12", 10);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, COST);
}

export async function comparePassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
