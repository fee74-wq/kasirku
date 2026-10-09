import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { SESSION_COOKIE, createSessionToken, hashPassword } from "@/lib/auth";
import { readJson, sessionCookieOptions } from "@/lib/server";
import { BUSINESS_TEMPLATES, type BusinessTypeKey } from "@/lib/menu-templates";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const body = await readJson<{
    name?: string;
    email?: string;
    password?: string;
    businessName?: string;
    businessType?: BusinessTypeKey;
    deviceId?: string;
  }>(req);

  if (!body) return NextResponse.json({ error: "Format tidak dikenali." }, { status: 400 });

  const name = String(body.name ?? "").trim().slice(0, 60);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const businessName = String(body.businessName ?? "").trim().slice(0, 60) || "Usaha Baru";
  const businessType = body.businessType && body.businessType in BUSINESS_TEMPLATES ? body.businessType : "lainnya";

  if (name.length < 2) return NextResponse.json({ error: "Nama kamu minimal 2 karakter." }, { status: 422 });
  if (!emailRe.test(email)) return NextResponse.json({ error: "Email tidak valid." }, { status: 422 });
  if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 422 });

  // Register with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const authUserId = authData.user?.id;

  const clash = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (clash.length > 0) {
    return NextResponse.json({ error: "Email sudah terdaftar. Silakan login." }, { status: 409 });
  }

  const [tenant] = await db
    .insert(businesses)
    .values({ businessName, businessType, subscriptionTier: "free" })
    .returning();

  const userValues: any = {
    tenantId: tenant.id,
    name,
    email,
    passwordHash: hashPassword(password),
    role: "owner",
  };

  if (authUserId) {
    userValues.id = authUserId;
  }

  const [user] = await db
    .insert(users)
    .values(userValues)
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, tenantId: users.tenantId });

  await db.update(users).set({ lastLoginAt: sql`now()` }).where(eq(users.id, user.id));

  const res = NextResponse.json({
    ok: true,
    user,
    business: { ...tenant, logo: null },
    needs_profile: businessName === "Usaha Baru",
  });
  res.cookies.set(SESSION_COOKIE, createSessionToken({ uid: user.id, tid: tenant.id, email }), sessionCookieOptions());
  return res;
}
