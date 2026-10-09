import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { getSession } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Cheap session probe used on app boot (and by the service worker shell). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, signed_in: false }, { status: 401 });

  const [result] = await db
    .select({ user: users, business: businesses })
    .from(users)
    .innerJoin(businesses, eq(businesses.id, users.tenantId))
    .where(eq(users.id, session.uid))
    .limit(1);

  if (!result) return NextResponse.json({ ok: false, signed_in: false }, { status: 401 });
  return NextResponse.json({ ok: true, signed_in: true, user: result.user, business: result.business });
}
