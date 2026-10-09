import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { businesses, categories, products, transactions, users, variantGroups, variants } from "@/db/schema";
import { flattenTemplate } from "@/lib/menu-templates";
import { toRp } from "@/lib/server";

/**
 * Server-side data access for KasirKu.
 *
 * Every function below takes an explicit tenant id that comes ONLY from the
 * signed session cookie and every single statement filters by it — that is the
 * data-isolation contract between businesses.
 */

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidRe.test(value);
}

export type ClientProduct = {
  id: string;
  category_id: string | null;
  name: string;
  base_price: number;
  image: string | null;
  glyph: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};
export type ClientVariant = { id: string; name: string; price_adjustment: number; is_default: boolean; sort_order: number };
export type ClientVariantGroup = {
  id: string;
  product_id: string;
  name: string;
  multiple: boolean;
  required: boolean;
  sort_order: number;
  variants: ClientVariant[];
};
export type ClientCategory = { id: string; name: string; emoji: string; sort_order: number; updated_at: string };

export async function readCatalog(tenantId: string) {
  const [catRows, prodRows, groupRows, variantRows] = await Promise.all([
    db.select().from(categories).where(and(eq(categories.tenantId, tenantId), isNull(categories.deletedAt))).orderBy(asc(categories.sortOrder)),
    db.select().from(products).where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt))).orderBy(asc(products.sortOrder)),
    db.select().from(variantGroups).where(eq(variantGroups.tenantId, tenantId)).orderBy(asc(variantGroups.sortOrder)),
    db.select().from(variants).where(eq(variants.tenantId, tenantId)).orderBy(asc(variants.sortOrder)),
  ]);

  const groupsByProduct = new Map<string, ClientVariantGroup[]>();
  for (const g of groupRows) {
    const list = groupsByProduct.get(g.productId) ?? [];
    list.push({
      id: g.id,
      product_id: g.productId,
      name: g.name,
      multiple: g.multiple,
      required: g.required,
      sort_order: g.sortOrder,
      variants: variantRows
        .filter((v) => v.groupId === g.id)
        .map((v) => ({ id: v.id, name: v.name, price_adjustment: v.priceAdjustment, is_default: v.isDefault, sort_order: v.sortOrder })),
    });
    groupsByProduct.set(g.productId, list);
  }

  return {
    categories: catRows.map<ClientCategory>((c) => ({ id: c.id, name: c.name, emoji: c.emoji, sort_order: c.sortOrder, updated_at: c.updatedAt.toISOString() })),
    products: prodRows.map<ClientProduct>((p) => ({
      id: p.id,
      category_id: p.categoryId,
      name: p.name,
      base_price: p.basePrice,
      image: p.image,
      glyph: p.glyph,
      is_active: p.isActive,
      sort_order: p.sortOrder,
      updated_at: p.updatedAt.toISOString(),
    })),
    variantGroups: groupRows.map((g) => groupsByProduct.get(g.productId) ?? []).flat().filter((g, i, arr) => arr.findIndex((x) => x.id === g.id) === i),
  };
}

/** Idempotent starter-menu seeding driven by the business type chosen during onboarding. */
export async function applyTemplate(tenantId: string, businessType: string) {
  const existing = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), isNull(products.deletedAt)));
  if ((existing[0]?.c ?? 0) > 0) return readCatalog(tenantId);

  const template = flattenTemplate(businessType);
  let categoryIndex = 0;
  for (const categoryName of [...new Set(template.map((t) => t.categoryName))]) {
    const emoji = template.find((t) => t.categoryName === categoryName)?.categoryEmoji ?? "🍽️";
    await db.insert(categories).values({ tenantId, name: categoryName, emoji, sortOrder: categoryIndex++ });
  }
  const catRows = await db.select().from(categories).where(and(eq(categories.tenantId, tenantId), isNull(categories.deletedAt)));
  const catIdByName = new Map(catRows.map((c) => [c.name, c.id]));

  let sort = 0;
  for (const item of template) {
    const productId = crypto.randomUUID();
    await db.insert(products).values({
      id: productId,
      tenantId,
      categoryId: catIdByName.get(item.categoryName) ?? null,
      name: item.name,
      basePrice: item.basePrice,
      glyph: item.glyph,
      isActive: true,
      sortOrder: sort++,
    });
    let gSort = 0;
    for (const group of item.groups) {
      const groupId = crypto.randomUUID();
      await db.insert(variantGroups).values({ tenantId, productId, name: group.name, multiple: group.multiple, required: group.required, sortOrder: gSort++ });
      let vSort = 0;
      await db.insert(variants).values(
        group.options.map((opt) => ({
          id: crypto.randomUUID(),
          tenantId,
          groupId,
          productId,
          name: opt.name,
          priceAdjustment: toRp(opt.priceAdjustment),
          isDefault: Boolean(opt.isDefault),
          sortOrder: vSort++,
        })),
      );
    }
  }
  return readCatalog(tenantId);
}

type PushBody = {
  device_id?: string;
  categories?: { id: string; name: string; emoji?: string; sort_order?: number; deleted?: boolean; updated_at?: string }[];
  products?: {
    id: string;
    category_id?: string | null;
    name: string;
    base_price: number;
    image?: string | null;
    glyph?: string | null;
    is_active?: boolean;
    sort_order?: number;
    deleted?: boolean;
  }[];
  variantGroups?: { id: string; product_id: string; name: string; multiple?: boolean; required?: boolean; sort_order?: number; deleted?: boolean }[];
  variants?: { id: string; group_id: string; product_id: string; name: string; price_adjustment?: number; is_default?: boolean; sort_order?: number }[];
  transactions?: {
    id: string;
    device_id?: string;
    items: unknown;
    subtotal: number;
    discount?: number;
    total: number;
    payment_method?: string;
    cash_received?: number;
    change_due?: number;
    note?: string | null;
    customer_name?: string | null;
    cashier_name?: string | null;
    created_at: string;
  }[];
};

/**
 * Append-friendly upserts. Conflicts resolve to a no-op when the existing row
 * belongs to a different tenant, so a crafted payload can never cross tenants.
 */
export async function pushMutations(tenantId: string, userId: string, body: PushBody) {
  const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 64) : "unknown";
  const applied = { categories: 0, products: 0, variantGroups: 0, variants: 0, transactions: 0 };
  const now = new Date();

  for (const c of body.categories ?? []) {
    if (!isUuid(c.id)) continue;
    const values = {
      id: c.id,
      tenantId,
      name: String(c.name ?? "Kategori").slice(0, 60),
      emoji: String(c.emoji ?? "🍽️").slice(0, 8),
      sortOrder: toRp(c.sort_order, 0),
      deletedAt: c.deleted ? now : null,
      updatedAt: now,
    };
    await db
      .insert(categories)
      .values(values)
      .onConflictDoUpdate({ target: categories.id, set: values, where: sql`${categories.tenantId} = ${tenantId}` });
    applied.categories++;
  }

  for (const p of body.products ?? []) {
    if (!isUuid(p.id)) continue;
    const categoryId = isUuid(p.category_id) ? p.category_id : null;
    const values = {
      tenantId,
      categoryId,
      name: String(p.name ?? "Menu").slice(0, 80),
      basePrice: Math.max(0, toRp(p.base_price)),
      image: typeof p.image === "string" && p.image.length < 400_000 ? p.image : null,
      glyph: typeof p.glyph === "string" ? p.glyph.slice(0, 8) : null,
      isActive: p.is_active !== false,
      sortOrder: toRp(p.sort_order, 0),
      deletedAt: p.deleted ? now : null,
      updatedAt: now,
    };
    await db
      .insert(products)
      .values({ id: p.id, ...values })
      .onConflictDoUpdate({ target: products.id, set: values, where: sql`${products.tenantId} = ${tenantId}` });
    applied.products++;
  }

  for (const g of body.variantGroups ?? []) {
    if (!isUuid(g.id) || !isUuid(g.product_id)) continue;
    const values = {
      tenantId,
      productId: g.product_id,
      name: String(g.name ?? "Pilihan").slice(0, 40),
      multiple: Boolean(g.multiple),
      required: g.required !== false,
      sortOrder: toRp(g.sort_order, 0),
      deletedAt: g.deleted ? now : null,
      updatedAt: now,
    };
    await db
      .insert(variantGroups)
      .values({ id: g.id, ...values })
      .onConflictDoUpdate({ target: variantGroups.id, set: values, where: sql`${variantGroups.tenantId} = ${tenantId}` });
    applied.variantGroups++;
  }

  for (const v of body.variants ?? []) {
    if (!isUuid(v.id) || !isUuid(v.group_id) || !isUuid(v.product_id)) continue;
    const values = {
      tenantId,
      groupId: v.group_id,
      productId: v.product_id,
      name: String(v.name ?? "Varian").slice(0, 40),
      priceAdjustment: toRp(v.price_adjustment, 0),
      isDefault: Boolean(v.is_default),
      sortOrder: toRp(v.sort_order, 0),
      updatedAt: now,
    };
    await db
      .insert(variants)
      .values({ id: v.id, ...values })
      .onConflictDoUpdate({ target: variants.id, set: values, where: sql`${variants.tenantId} = ${tenantId}` });
    applied.variants++;
  }

  // Transactions: insert-only. Existing rows are never touched (immutable ledger).
  for (const t of body.transactions ?? []) {
    if (!isUuid(t.id) || !Array.isArray(t.items)) continue;
    const createdAt = new Date(t.created_at);
    const subtotal = Math.max(0, toRp(t.subtotal));
    const discount = Math.max(0, toRp(t.discount, 0));
    const total = Math.max(0, toRp(t.total, subtotal - discount));
    const inserted = await db
      .insert(transactions)
      .values({
        id: t.id,
        tenantId,
        deviceId: (t.device_id ?? deviceId).slice(0, 64),
        items: t.items,
        itemCount: t.items.reduce((n: number, i: { qty?: number }) => n + (Number(i?.qty) || 0), 0),
        subtotal,
        discount,
        total,
        paymentMethod: String(t.payment_method ?? "tunai").slice(0, 20),
        cashReceived: Math.max(0, toRp(t.cash_received, total)),
        changeDue: Math.max(0, toRp(t.change_due, 0)),
        note: typeof t.note === "string" ? t.note.slice(0, 200) : null,
        customerName: typeof t.customer_name === "string" ? t.customer_name.slice(0, 60) : null,
        cashierName: typeof t.cashier_name === "string" ? t.cashier_name.slice(0, 60) : null,
        createdAt: Number.isNaN(createdAt.getTime()) ? now : createdAt,
        syncedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: transactions.id });
    if (inserted.length > 0) applied.transactions++;
  }

  await db.update(users).set({ lastLoginAt: now }).where(eq(users.id, userId));
  await db.update(businesses).set({ updatedAt: now }).where(eq(businesses.id, tenantId));

  return { ok: true as const, applied, server_time: now.toISOString() };
}

export async function pullSnapshot(tenantId: string, since?: string | null) {
  const sinceDate = since && !Number.isNaN(Date.parse(since)) ? new Date(since) : null;
  const [business] = await db.select().from(businesses).where(eq(businesses.id, tenantId));
  const txnRows = sinceDate
    ? await db.select().from(transactions).where(and(eq(transactions.tenantId, tenantId), sql`${transactions.createdAt} > ${sinceDate.toISOString()}`)).orderBy(asc(transactions.createdAt))
    : await db
        .select()
        .from(transactions)
        .where(eq(transactions.tenantId, tenantId))
        .orderBy(sql`${transactions.createdAt} desc`)
        .limit(2000);
  const catalog = await readCatalog(tenantId);
  return {
    ok: true as const,
    business,
    server_time: new Date().toISOString(),
    ...catalog,
    transactions: txnRows.map((t) => ({
      id: t.id,
      device_id: t.deviceId,
      items: t.items,
      item_count: t.itemCount,
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total,
      payment_method: t.paymentMethod,
      cash_received: t.cashReceived,
      change_due: t.changeDue,
      note: t.note,
      customer_name: t.customerName,
      cashier_name: t.cashierName,
      created_at: t.createdAt.toISOString(),
      synced: true,
    })),
  };
}

export async function tenantOf(email: string) {
  return db.select().from(users).where(inArray(users.email, [email.toLowerCase()]));
}
