import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { SESSION_COOKIE, createSessionToken } from "@/lib/auth";
import { readJson, sessionCookieOptions } from "@/lib/server";
import { BUSINESS_TEMPLATES, type BusinessTypeKey } from "@/lib/menu-templates";

export const dynamic = "force-dynamic";

/**
 * Google Sign-In (one-tap credential token verified server-side).
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID; the client hides the button when unset.
 */
async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const claims = (await res.json()) as { aud?: string; email?: string; name?: string; picture?: string; given_name?: string };
  if (claims.aud !== clientId || !claims.email) return null;
  return { email: claims.email.toLowerCase(), name: claims.name ?? claims.given_name ?? "Pengguna Google", picture: claims.picture ?? null };
}

export async function POST(req: Request) {
  const body = await readJson<{ credential?: string; businessType?: BusinessTypeKey }>(req);
  const credential = String(body?.credential ?? "");
  if (!credential) return NextResponse.json({ error: "Token Google tidak ada." }, { status: 400 });

  const profile = await verifyGoogleCredential(credential);
  if (!profile) {
    return NextResponse.json(
      { error: "Google Sign-In belum diaktifkan di server ini. Gunakan email & password dulu.", code: "google_not_configured" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ user: users, business: businesses })
    .from(users)
    .innerJoin(businesses, eq(businesses.id, users.tenantId))
    .where(eq(users.email, profile.email))
    .limit(1);

  if (existing) {
    await db.update(users).set({ lastLoginAt: sql`now()` }).where(eq(users.id, existing.user.id));
    const res = NextResponse.json({ ok: true, user: existing.user, business: existing.business, needs_profile: existing.business.businessName === "Usaha Baru" });
    res.cookies.set(
      SESSION_COOKIE,
      createSessionToken({ uid: existing.user.id, tid: existing.business.id, email: existing.user.email }),
      sessionCookieOptions(),
    );
    return res;
  }

  const businessType = body?.businessType && body.businessType in BUSINESS_TEMPLATES ? body.businessType : "lainnya";
  const [tenant] = await db.insert(businesses).values({ businessName: "Usaha Baru", businessType, subscriptionTier: "free" }).returning();
  const [user] = await db
    .insert(users)
    .values({ tenantId: tenant.id, name: profile.name.slice(0, 60), email: profile.email, passwordHash: null, role: "owner" })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, tenantId: users.tenantId });

  const res = NextResponse.json({ ok: true, user, business: tenant, needs_profile: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken({ uid: user.id, tid: tenant.id, email: profile.email }), sessionCookieOptions());
  return res;
}
