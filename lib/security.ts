import crypto from "crypto";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function verifySignedToken(payload: string, token: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 24);
  return token === expected;
}

export function hashString(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
