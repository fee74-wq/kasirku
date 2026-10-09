import { NextResponse } from "next/server";
import { isResponse, readJson, requireTenant } from "@/lib/server";
import type { Session } from "@/lib/server";
import { pushMutations } from "@/server/data";

export const dynamic = "force-dynamic";

/**
 * Local-first write path: the device already committed everything to IndexedDB
 * and answered the cashier instantly; this endpoint just makes it durable.
 * Safe to retry — ids are device-generated, transactions insert-once.
 */
export async function POST(req: Request) {
  const session = await requireTenant();
  if (isResponse(session)) return session;
  const s = session as Session;

  const body = await readJson<Parameters<typeof pushMutations>[2]>(req);
  if (!body) return NextResponse.json({ error: "Format tidak dikenali." }, { status: 400 });

  try {
    const result = await pushMutations(s.tid, s.uid, body);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync/push]", err);
    return NextResponse.json({ error: "Gagal menyimpan ke server.", detail: String(err) }, { status: 500 });
  }
}
