import { supabase } from "./supabase";
import { openDB } from "idb";

const DB_NAME = "kasirku_local";
const DB_VERSION = 1;

export async function getLocalDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("variant_groups")) {
        db.createObjectStore("variant_groups", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        db.createObjectStore("transactions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
    },
  });
}

/**
 * Push local changes (outbox & transactions) to Supabase.
 */
export async function pushSync(tenantId: string) {
  if (!navigator.onLine) return { success: false, reason: "offline" };

  try {
    const db = await getLocalDB();
    
    // 1. Push unsynced transactions
    const txns = await db.getAll("transactions");
    const unsyncedTxns = txns.filter((t: any) => !t.synced && t.tenant_id === tenantId);

    if (unsyncedTxns.length > 0) {
      const payload = unsyncedTxns.map((t) => ({
        id: t.id,
        tenant_id: t.tenant_id,
        device_id: t.device_id,
        items: t.items,
        item_count: t.item_count,
        subtotal: t.subtotal,
        discount: t.discount,
        total: t.total,
        payment_method: t.payment_method,
        cash_received: t.cash_received,
        change_due: t.change_due,
        note: t.note,
        customer_name: t.customer_name,
        cashier_name: t.cashier_name,
        created_at: t.created_at,
      }));

      const { error } = await supabase.from("transactions").upsert(payload, { onConflict: "id" });
      if (!error) {
        const tx = db.transaction("transactions", "readwrite");
        for (const t of unsyncedTxns) {
          t.synced = true;
          await tx.store.put(t);
        }
        await tx.done;
      } else {
        console.error("Failed to push transactions:", error);
      }
    }

    // 2. Push general outbox changes (categories, products, etc.)
    const outboxItems = await db.getAll("outbox");
    const tenantOutbox = outboxItems.filter((o: any) => o.tenantId === tenantId);

    for (const item of tenantOutbox) {
      const { table, op, data } = item;
      let error = null;

      if (op === "upsert") {
        const res = await supabase.from(table).upsert({ ...data, tenant_id: tenantId });
        error = res.error;
      } else if (op === "delete") {
        const res = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", data.id).eq("tenant_id", tenantId);
        error = res.error;
      }

      if (!error) {
        await db.delete("outbox", item.id);
      } else {
        console.error(`Failed to sync outbox item for ${table}:`, error);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("pushSync error:", err);
    return { success: false, reason: "network_error" };
  }
}

/**
 * Pull remote changes from Supabase down to local IndexedDB.
 */
export async function pullSync(tenantId: string) {
  if (!navigator.onLine) return { success: false, reason: "offline" };

  try {
    const db = await getLocalDB();
    const metaKey = `last_pull_${tenantId}`;
    const lastPull = (await db.get("meta", metaKey)) || new Date(0).toISOString();
    const now = new Date().toISOString();

    const tables = ["categories", "products", "variant_groups", "transactions"];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .gt("updated_at", lastPull);

      if (error) {
        console.error(`Failed to pull ${table}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const tx = db.transaction(table, "readwrite");
        for (const row of data) {
          await tx.store.put(row);
        }
        await tx.done;
      }
    }

    await db.put("meta", now, metaKey);
    return { success: true };
  } catch (err) {
    console.error("pullSync error:", err);
    return { success: false, reason: "network_error" };
  }
}

/**
 * Run full bidirectional sync sequence.
 */
export async function syncAll(tenantId: string) {
  if (!navigator.onLine) return;
  try {
    await pushSync(tenantId);
    await pullSync(tenantId);
  } catch (err) {
    console.error("Sync error:", err);
  }
}

/**
 * Register event listeners to attempt flushing local changes before user closes the app.
 */
export function initAutoSync(tenantId: string) {
  if (typeof window === "undefined") return;

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      pushSync(tenantId).catch(() => {});
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", () => {
    pushSync(tenantId).catch(() => {});
  });

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
