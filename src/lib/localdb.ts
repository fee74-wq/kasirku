import { openDB, type IDBPDatabase } from "idb";

/**
 * On-device store (IndexedDB) — the PRIMARY write target of the app.
 * A sale is committed here and the UI answers immediately; the network is a
 * background concern. Every store is indexed by tenant_id so reads are always
 * scoped to one workspace, mirroring the server-side isolation rule.
 */

export type LocalStore = "categories" | "products" | "variant_groups" | "transactions";

const STORES: LocalStore[] = ["categories", "products", "variant_groups", "transactions"];
const DB_NAME = "kasirku-local";
const DB_VERSION = 1;

let handle: Promise<IDBPDatabase> | null = null;

function open() {
  if (!handle) {
    handle = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
        for (const name of STORES) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          store.createIndex("tenant", "tenant_id", { unique: false });
          if (name === "transactions") {
            store.createIndex("created", "created_at", { unique: false });
            store.createIndex("pending", "synced", { unique: false });
          }
        }
      },
    });
  }
  return handle;
}

export async function putRecord(store: LocalStore, record: Record<string, unknown>) {
  const db = await open();
  await db.put(store, record);
}

export async function putMany(store: LocalStore, records: Record<string, unknown>[]) {
  if (records.length === 0) return;
  const db = await open();
  const tx = db.transaction(store, "readwrite");
  for (const record of records) await tx.store.put(record);
  await tx.done;
}

export async function allForTenant<T>(store: LocalStore, tenantId: string): Promise<T[]> {
  const db = await open();
  return (await db.getAllFromIndex(store, "tenant", tenantId)) as T[];
}

export async function deleteForTenant(store: LocalStore, tenantId: string) {
  const db = await open();
  const tx = db.transaction(store, "readwrite");
  let cursor = await tx.store.index("tenant").openCursor(tenantId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAllLocal() {
  const db = await open();
  const tx = db.transaction([...STORES, "kv"], "readwrite");
  for (const store of [...STORES, "kv"]) await tx.objectStore(store).clear();
  await tx.done;
}

export async function setMeta(key: string, value: unknown) {
  const db = await open();
  await db.put("kv", { key, value });
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const db = await open();
  const row = (await db.get("kv", key)) as { value: T } | undefined;
  return row ? row.value : null;
}

export async function estimatedUsage(): Promise<number> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return est.usage ?? 0;
    }
  } catch {
    /* ignore */
  }
  return 0;
}
