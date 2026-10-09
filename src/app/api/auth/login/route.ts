import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { SESSION_COOKIE, createSessionToken, verifyPassword } from "@/lib/auth";
import { readJson, sessionCookieOptions } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson<{ email?: string; password?: string }>(req);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "Email & password wajib diisi." }, { status: 400 });

  const [row] = await db
    .select({ user: users, business: businesses })
    .from(users)
    .innerJoin(businesses, eq(businesses.id, users.tenantId))
    .where(eq(users.email, email))
    .limit(1);

  if (!row || !verifyPassword(password, row.user.passwordHash)) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  await db.update(users).set({ lastLoginAt: sql`now()` }).where(eq(users.id, row.user.id));

  const res = NextResponse.json({ ok: true, user: row.user, business: row.business, needs_profile: row.business.businessName === "Usaha Baru" });
  res.cookies.set(
    SESSION_COOKIE,
    createSessionToken({ uid: row.user.id, tid: row.business.id, email: row.user.email }),
    sessionCookieOptions(),
  );
  return res;
}
