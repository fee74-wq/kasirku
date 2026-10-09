import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing + stateless signed session token.
 * Kept dependency-free (node:crypto) so the bundle stays light for low-end devices.
 */

const SECRET = process.env.AUTH_SECRET ?? "kasirku-local-development-secret";
export const SESSION_COOKIE = "kasirku_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60 days — this is a shared family device

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

type SessionPayload = { uid: string; tid: string; email: string };

function b64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + SESSION_MAX_AGE * 1000 }));
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload & { exp: number };
    if (!parsed.tid || !parsed.uid) return null;
    if (typeof parsed.exp === "number" && parsed.exp < Date.now()) return null;
    return { uid: parsed.uid, tid: parsed.tid, email: parsed.email };
  } catch {
    return null;
  }
}
