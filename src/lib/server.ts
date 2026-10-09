import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";

export type Session = { uid: string; tid: string; email: string };

/** Reads + verifies the session cookie. Returns null for anonymous callers. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/** Every tenant-scoped route funnels through this — the tenant id is never taken from the body. */
export async function requireTenant(): Promise<Session | NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return session;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 60,
  };
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Guards against non-integer money coming from a client. */
export function toRp(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(-1_000_000_000, Math.min(1_000_000_000, Math.round(n)));
}
