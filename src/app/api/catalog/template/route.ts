import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { isResponse, readJson, requireTenant } from "@/lib/server";
import type { Session } from "@/lib/server";
import { applyTemplate } from "@/server/data";

export const dynamic = "force-dynamic";

/** POST { reset?: boolean } — materialise the starter menu for this tenant's business type. */
export async function POST(req: Request) {
  const session = await requireTenant();
  if (isResponse(session)) return session;
  const tid = (session as Session).tid;

  const body = await readJson<{ businessType?: string }>(req);
  const [business] = await db.select().from(businesses).where(eq(businesses.id, tid));
  if (!business) return NextResponse.json({ error: "Tenant tidak ditemukan." }, { status: 404 });

  const type = body?.businessType ?? business.businessType;
  if (body?.businessType && body.businessType !== business.businessType) {
    await db.update(businesses).set({ businessType: body.businessType.slice(0, 24), updatedAt: new Date() }).where(eq(businesses.id, tid));
  }
  const catalog = await applyTemplate(tid, type);
  return NextResponse.json({ ok: true, ...catalog });
}
