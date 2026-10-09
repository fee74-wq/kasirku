import { NextResponse } from "next/server";
import { isResponse, requireTenant } from "@/lib/server";
import type { Session } from "@/lib/server";
import { pullSnapshot } from "@/server/data";

export const dynamic = "force-dynamic";

/** Full catalog snapshot + sales rows newer than `since` (other devices / reinstall). */
export async function GET(req: Request) {
  const session = await requireTenant();
  if (isResponse(session)) return session;
  const s = session as Session;
  const since = new URL(req.url).searchParams.get("since");
  try {
    return NextResponse.json(await pullSnapshot(s.tid, since));
  } catch (err) {
    console.error("[sync/pull]", err);
    return NextResponse.json({ error: "Gagal mengambil data." }, { status: 500 });
  }
}
