import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { isResponse, readJson, requireTenant } from "@/lib/server";
import type { Session } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireTenant();
  if (isResponse(session)) return session;
  const [business] = await db.select().from(businesses).where(eq(businesses.id, (session as Session).tid));
  if (!business) return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true, business });
}

export async function PATCH(req: Request) {
  const session = await requireTenant();
  if (isResponse(session)) return session;
  const tid = (session as Session).tid;

  const body = await readJson<{
    businessName?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    logo?: string | null;
    receiptFooter?: string | null;
    subscriptionTier?: string;
  }>(req);
  if (!body) return NextResponse.json({ error: "Format tidak dikenali." }, { status: 400 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.businessName === "string" && body.businessName.trim().length >= 2) patch.businessName = body.businessName.trim().slice(0, 60);
  if (typeof body.businessType === "string") patch.businessType = body.businessType.slice(0, 24);
  if (typeof body.address === "string") patch.address = body.address.slice(0, 240);
  if (typeof body.phone === "string") patch.phone = body.phone.slice(0, 24);
  if (typeof body.receiptFooter === "string") patch.receiptFooter = body.receiptFooter.slice(0, 160);
  if (body.logo === null) patch.logo = null;
  else if (typeof body.logo === "string" && body.logo.length < 400_000) patch.logo = body.logo;
  // Subscription tier changes are gated server-side: payment integration is Tahap 3.
  if (body.subscriptionTier === "free") patch.subscriptionTier = "free";
  else if (body.subscriptionTier) {
    return NextResponse.json(
      { error: "Pembayaran langganan belum aktif. Tier tetap gratis sampai gateway terhubung.", code: "payment_not_configured" },
      { status: 501 },
    );
  }

  const [business] = await db.update(businesses).set(patch).where(eq(businesses.id, tid)).returning();
  return NextResponse.json({ ok: true, business });
}
