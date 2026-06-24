import jwt from "jsonwebtoken";

/**
 * JWT helpers — short-lived access token + long-lived refresh token.
 * Secrets .env se aate hain (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET).
 */
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function assertSecrets() {
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error(
      "JWT secrets missing — set JWT_ACCESS_SECRET & JWT_REFRESH_SECRET in .env"
    );
  }
}

export function signAccessToken(payload) {
  assertSecrets();
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload) {
  assertSecrets();
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token) {
  assertSecrets();
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  assertSecrets();
  return jwt.verify(token, REFRESH_SECRET);
}
