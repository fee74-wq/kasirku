import { useSyncExternalStore } from "react";
import { api, ApiError } from "@/lib/api";
import { deviceId, uuid } from "@/lib/device";
import * as idb from "@/lib/localdb";
import { RP, discountFromPercent } from "@/lib/money";
import { flattenTemplate, type BusinessTypeKey } from "@/lib/menu-templates";
import type { Business, CartLine, Category, PaymentMethod, Product, TenantUser, Txn, TxnItem, TxnOption, VariantGroup, VariantOption } from "@/lib/types";

/* ------------------------------------------------------------------ state -- */

export type Toast = { id: number; msg: string; kind: "ok" | "err" | "info" } | null;

export type State = {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  lastSyncAt: string | null;
  user: TenantUser | null;
  business: Business | null;
  categories: Category[];
  products: Product[];
  groups: VariantGroup[];
  transactions: Txn[];
  cart: CartLine[];
  discount: number;
  toast: Toast;
  lastTxn: Txn | null;
};

let state: State = {
  ready: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  syncError: null,
  lastSyncAt: null,
  user: null,
  business: null,
  categories: [],
  products: [],
  groups: [],
  transactions: [],
  cart: [],
  discount: 0,
  toast: null,
  lastTxn: null,
};

const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function getState() {
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAppState(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function toast(msg: string, kind: "ok" | "err" | "info" = "ok") {
  const id = Date.now();
  set({ toast: { id, msg, kind } });
  setTimeout(() => {
    if (state.toast?.id === id) set({ toast: null });
  }, 3200);
}

/* ----------------------------------------------------------------- mapping -- */

type AnyRecord = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function mapBusiness(raw: AnyRecord | null | undefined): Business | null {
  if (!raw) return null;
  const tier = str(raw.subscription_tier ?? (raw as AnyRecord).subscriptionTier, "free");
  return {
    id: str(raw.id),
    business_name: str(raw.business_name ?? (raw as AnyRecord).businessName, "Usaha"),
    business_type: (str(raw.business_type ?? (raw as AnyRecord).businessType, "lainnya") as BusinessTypeKey) || "lainnya",
    address: (raw.address as string) ?? null,
    phone: (raw.phone as string) ?? null,
    logo: (raw.logo as string) ?? null,
    receipt_footer: (raw.receipt_footer ?? (raw as AnyRecord).receiptFooter ?? null) as string | null,
    subscription_tier: tier === "umkm" || tier === "pro" ? tier : "free",
    created_at: (raw.created_at ?? (raw as AnyRecord).createdAt) as string | undefined,
  };
}

function mapUser(raw: AnyRecord | null | undefined): TenantUser | null {
  if (!raw) return null;
  return {
    id: str(raw.id),
    name: str(raw.name, "Kasir"),
    email: str(raw.email),
    role: str(raw.role, "owner"),
    tenant_id: str(raw.tenant_id ?? (raw as AnyRecord).tenantId),
  };
}

function mapGroup(raw: AnyRecord): VariantGroup {
  const list = (raw.variants ?? raw.options ?? []) as AnyRecord[];
  return {
    id: str(raw.id),
    tenant_id: str(raw.tenant_id ?? raw.tenantId),
    product_id: str(raw.product_id ?? raw.productId),
    name: str(raw.name, "Pilihan"),
    multiple: Boolean(raw.multiple),
    required: raw.required !== false,
    sort_order: num(raw.sort_order ?? raw.sortOrder),
    dirty: 0,
    options: list.map<VariantOption>((v) => ({
      id: str(v.id),
      name: str(v.name),
      price_adjustment: num(v.price_adjustment ?? v.priceAdjustment),
      is_default: Boolean(v.is_default ?? v.isDefault),
      sort_order: num(v.sort_order ?? v.sortOrder),
    })),
  };
}

function mapProduct(raw: AnyRecord): Product {
  return {
    id: str(raw.id),
    tenant_id: str(raw.tenant_id ?? raw.tenantId),
    category_id: (raw.category_id ?? raw.categoryId ?? null) as string | null,
    name: str(raw.name, "Menu"),
    base_price: RP(num(raw.base_price ?? raw.basePrice)),
    image: (raw.image as string) ?? null,
    glyph: (raw.glyph as string) ?? null,
    is_active: raw.is_active !== false && raw.isActive !== false,
    sort_order: num(raw.sort_order ?? raw.sortOrder),
    deleted: Boolean(raw.deleted),
    dirty: num(raw.dirty, 0) as 0 | 1,
    updated_at: str(raw.updated_at ?? raw.updatedAt) || undefined,
  };
}

function mapTxn(raw: AnyRecord): Txn {
  const items = (Array.isArray(raw.items) ? raw.items : []) as TxnItem[];
  return {
    id: str(raw.id),
    tenant_id: str(raw.tenant_id ?? raw.tenantId),
    device_id: str(raw.device_id ?? raw.deviceId),
    items,
    item_count: num(raw.item_count ?? raw.itemCount, items.reduce((n, i) => n + num(i.qty), 0)),
    subtotal: RP(num(raw.subtotal)),
    discount: RP(num(raw.discount)),
    total: RP(num(raw.total)),
    payment_method: (str(raw.payment_method ?? raw.paymentMethod, "tunai") as PaymentMethod) || "tunai",
    cash_received: RP(num(raw.cash_received ?? raw.cashReceived)),
    change_due: RP(num(raw.change_due ?? raw.changeDue)),
    note: (raw.note as string) ?? null,
    customer_name: (raw.customer_name ?? raw.customerName ?? null) as string | null,
    cashier_name: (raw.cashier_name ?? raw.cashierName ?? null) as string | null,
    created_at: str(raw.created_at ?? raw.createdAt) || new Date().toISOString(),
    synced: raw.synced === 0 || raw.synced === false ? 0 : 1,
  };
}

/* ------------------------------------------------------------ persistence -- */

async function persistCatalog() {
  const tenantId = state.business?.id;
  if (!tenantId) return;
  await idb.putMany("categories", state.categories as unknown as AnyRecord[]);
  await idb.putMany("products", state.products as unknown as AnyRecord[]);
  await idb.putMany("variant_groups", state.groups as unknown as AnyRecord[]);
}

async function saveTxn(txn: Txn) {
  await idb.putRecord("transactions", txn as unknown as AnyRecord);
}

let cartTimer: number | undefined;
function persistCart() {
  window.clearTimeout(cartTimer);
  cartTimer = window.setTimeout(() => {
    void idb.setMeta(`cart:${state.business?.id ?? "none"}`, state.cart);
  }, 250);
}

/* ----------------------------------------------------------------- bootstrap */

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

export async function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    if (bootstrapped && state.business?.id) return;
    bootstrapped = true;

    const [tenantId, user, business, lastSyncAt] = await Promise.all([
      idb.getMeta<string>("activeTenant"),
      idb.getMeta<TenantUser>("user"),
      idb.getMeta<Business>("business"),
      idb.getMeta<string>("lastSyncAt"),
    ]);

    if (tenantId && user && business && user.tenant_id === tenantId) {
      const [categories, products, groups, transactions, cart] = await Promise.all([
        idb.allForTenant<Category>("categories", tenantId),
        idb.allForTenant<Product>("products", tenantId),
        idb.allForTenant<VariantGroup>("variant_groups", tenantId),
        idb.allForTenant<Txn>("transactions", tenantId),
        idb.getMeta<CartLine[]>(`cart:${tenantId}`),
      ]);
      set({
        user,
        business,
        categories: categories.filter((c) => !c.deleted).sort((a, b) => a.sort_order - b.sort_order),
        products: products.filter((p) => !p.deleted).sort((a, b) => a.sort_order - b.sort_order),
        groups: groups.filter((g) => !g.deleted),
        transactions: transactions.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        cart: Array.isArray(cart) ? cart : [],
        lastSyncAt,
        ready: true,
      });
    }

    // Revalidate the session against the server, then sync if we can.
    try {
      const me = await api<{ signed_in?: boolean; user?: AnyRecord; business?: AnyRecord }>("/api/auth/me");
      if (me.signed_in) {
        const nextUser = mapUser(me.user);
        const nextBusiness = mapBusiness(me.business);
        if (nextUser && nextBusiness) {
          const activeTenantId = tenantId || state.business?.id;
          if (activeTenantId && activeTenantId !== nextBusiness.id) {
            // A different workspace logged in on this device — wipe, then pull fresh.
            await idb.clearAllLocal();
            set({ categories: [], products: [], groups: [], transactions: [], cart: [] });
          }
          set({ user: nextUser, business: nextBusiness, ready: true });
          await idb.setMeta("activeTenant", nextBusiness.id);
          await idb.setMeta("user", nextUser);
          await idb.setMeta("business", nextBusiness);
          await syncNow({ silent: true });
        }
      } else if (state.user) {
        await signOutLocal();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) await signOutLocal();
      // offline / unreachable: keep serving the local snapshot
    } finally {
      set({ ready: true });
    }

    window.addEventListener("online", () => {
      set({ online: true });
      void syncNow({ silent: true });
    });
    window.addEventListener("offline", () => set({ online: false }));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && navigator.onLine) void syncNow({ silent: true });
    });
    window.setInterval(() => {
      if (navigator.onLine && state.business) void syncNow({ silent: true });
    }, 60_000);
  })();
  return bootstrapPromise;
}

async function signOutLocal() {
  set({ user: null, business: null, categories: [], products: [], groups: [], transactions: [], cart: [], discount: 0, ready: true });
}

/* ----------------------------------------------------------------- sync core */

export type PushPayload = {
  device_id: string;
  categories?: unknown[];
  products?: unknown[];
  variantGroups?: unknown[];
  variants?: unknown[];
  transactions?: unknown[];
};

function collectDirty(): PushPayload | null {
  if (!state.business) return null;
  const categories = state.categories.filter((c) => c.dirty === 1).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, sort_order: c.sort_order, deleted: !!c.deleted }));
  const products = state.products
    .filter((p) => p.dirty === 1)
    .map((p) => ({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      base_price: p.base_price,
      image: p.image,
      glyph: p.glyph,
      is_active: p.is_active,
      sort_order: p.sort_order,
      deleted: !!p.deleted,
    }));
  const groups = state.groups.filter((g) => g.dirty === 1);
  const variantGroups = groups.map((g) => ({ id: g.id, product_id: g.product_id, name: g.name, multiple: g.multiple, required: g.required, sort_order: g.sort_order, deleted: !!g.deleted }));
  const variantRows = groups.flatMap((g) => g.options.map((o, i) => ({ id: o.id, group_id: g.id, product_id: g.product_id, name: o.name, price_adjustment: o.price_adjustment, is_default: o.is_default, sort_order: i })));
  const pending = state.transactions.filter((t) => t.synced === 0);
  const transactions = pending.map((t) => ({
    id: t.id,
    device_id: t.device_id,
    items: t.items,
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

  if (!categories.length && !products.length && !variantGroups.length && !transactions.length) return null;
  return { device_id: deviceId(), categories, products, variantGroups, variants: variantRows, transactions };
}

type PullResponse = {
  server_time?: string;
  business?: AnyRecord;
  categories?: AnyRecord[];
  products?: AnyRecord[];
  variantGroups?: AnyRecord[];
  transactions?: AnyRecord[];
};

let syncInFlight: Promise<void> | null = null;
let syncTimer: number | undefined;

export function queueSync(delay = 900) {
  if (typeof window === "undefined") return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => void syncNow(), delay);
}

export async function syncNow(opts: { silent?: boolean } = {}) {
  if (!state.business || !state.user) return;
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const tenantId = state.business?.id;
    if (!tenantId) {
      set({ syncing: false });
      return;
    }
    set({ syncing: true });
    try {
      const payload = collectDirty();
      if (payload) await api("/api/sync/push", { method: "POST", body: JSON.stringify(payload) });

      const since = await idb.getMeta<string>(`since:${tenantId}`);
      const pull = await api<PullResponse>(`/api/sync/pull${since ? `?since=${encodeURIComponent(since)}` : ""}`);

      const incomingProducts = (pull.products ?? []).map(mapProduct);
      const incomingCats = (pull.categories ?? []) as unknown as Category[];
      const incomingGroups = (pull.variantGroups ?? []).map(mapGroup);

      // Last-write-wins with the device as the writer: rows still dirty locally
      // survive the pull and are re-pushed on the next tick.
      const dirty = (id: string, rows: { id: string; dirty?: 0 | 1 }[]) => rows.some((r) => r.id === id && r.dirty === 1);
      const mergedProducts = [...incomingProducts.filter((p) => !dirty(p.id, state.products)), ...state.products.filter((p) => p.dirty === 1)];
      const mergedCats = [...incomingCats.filter((c) => !dirty(c.id, state.categories)), ...state.categories.filter((c) => c.dirty === 1)];
      const mergedGroups = [...incomingGroups.filter((g) => !dirty(g.id, state.groups)), ...state.groups.filter((g) => g.dirty === 1)];

      const serverTxns = (pull.transactions ?? []).map(mapTxn).filter((t) => t.id);
      const mergedTxns = new Map<string, Txn>();
      for (const t of [...state.transactions, ...serverTxns]) mergedTxns.set(t.id, t.synced === 0 && !serverTxns.some((s) => s.id === t.id) ? t : { ...t, synced: 1 });
      const transactions = [...mergedTxns.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

      const business: Business = mapBusiness(pull.business) ??
        getState().business ?? {
          id: tenantId,
          business_name: "Usaha",
          business_type: "lainnya",
          address: null,
          phone: null,
          logo: null,
          receipt_footer: null,
          subscription_tier: "free",
        };
      set({
        business,
        categories: (incomingCats as unknown as Category[]).sort((a, b) => a.sort_order - b.sort_order),
        products: mergedProducts.sort((a, b) => a.sort_order - b.sort_order),
        groups: mergedGroups,
        transactions,
        syncing: false,
        syncError: null,
        lastSyncAt: pull.server_time ?? new Date().toISOString(),
      });

      if (payload) {
        set({
          categories: state.categories.map((c) => ({ ...c, dirty: 0 })),
          products: state.products.map((p) => ({ ...p, dirty: 0 })),
          groups: state.groups.map((g) => ({ ...g, dirty: 0 })),
        });
      }

      await idb.setMeta(`since:${tenantId}`, pull.server_time ?? new Date().toISOString());
      await idb.setMeta("lastSyncAt", pull.server_time ?? new Date().toISOString());
      await idb.setMeta("business", business);
      await persistCatalog();
      for (const t of transactions.slice(0, 800)) await idb.putRecord("transactions", t as unknown as AnyRecord);
      if (!opts.silent) toast("Data tersinkron ke server ☁️", "ok");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Belum bisa sinkron. Data tetap aman di HP.";
      set({ syncing: false, syncError: msg });
      if (!opts.silent) toast(msg, "err");
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

export const pendingCount = () => state.transactions.filter((t) => t.synced === 0).length + state.products.filter((p) => p.dirty === 1).length + state.categories.filter((c) => c.dirty === 1).length + state.groups.filter((g) => g.dirty === 1).length;

/* -------------------------------------------------------------- auth flows -- */

export async function completeOnboarding(result: { user?: AnyRecord; business?: AnyRecord }, typeKey: BusinessTypeKey, seedTemplate: boolean) {
  const user = mapUser(result.user);
  const business = mapBusiness(result.business);
  if (!user || !business) throw new ApiError("Sesi tidak valid.", 500);
  if (state.business?.id !== business.id) {
    await idb.clearAllLocal();
    set({ categories: [], products: [], groups: [], transactions: [], cart: [] });
  }
  set({ user, business, ready: true });
  await idb.setMeta("activeTenant", business.id);
  await idb.setMeta("user", user);
  await idb.setMeta("business", business);
  if (seedTemplate) await applyTemplateLocally(typeKey, { replace: false });
  void syncNow({ silent: true });
}

export async function signOut() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    /* still clear locally */
  }
  await idb.clearAllLocal();
  set({ user: null, business: null, categories: [], products: [], groups: [], transactions: [], cart: [], discount: 0, lastTxn: null, syncError: null });
}

export async function saveBusinessProfile(patch: Partial<Business>) {
  const business = mapBusiness(
    await api<{ business: AnyRecord }>("/api/business", {
      method: "PATCH",
      body: JSON.stringify({
        businessName: patch.business_name,
        businessType: patch.business_type,
        address: patch.address,
        phone: patch.phone,
        logo: patch.logo,
        receiptFooter: patch.receipt_footer,
      }),
    }),
  );
  if (business) {
    set({ business });
    await idb.setMeta("business", business);
  }
  toast("Profil usaha tersimpan ✅", "ok");
}

/* ------------------------------------------------------------ starter menus -- */

export async function applyTemplateLocally(typeKey: BusinessTypeKey, opts: { replace?: boolean } = {}) {
  await bootstrap();
  let tenantId = state.business?.id;
  if (!tenantId) {
    // Retry once if bootstrap is still resolving the session
    await new Promise((r) => setTimeout(r, 600));
    tenantId = state.business?.id;
  }
  if (!tenantId) {
    throw new ApiError("Sesi belum siap. Pastikan Anda sudah login.", 400);
  }
  if (opts.replace) {
    set({ categories: [], products: [], groups: [] });
    for (const store of ["categories", "products", "variant_groups"] as const) await idb.deleteForTenant(store, tenantId);
  }

  const existingNames = new Set(state.products.map((p) => p.name.toLowerCase()));
  const items = flattenTemplate(typeKey).filter((i) => !existingNames.has(i.name.toLowerCase()));
  if (items.length === 0) {
    toast("Menu template sudah pernah ditambahkan.", "info");
    return;
  }

  const catByName = new Map(state.categories.map((c) => [c.name, c.id]));
  const newCats: Category[] = [];
  let catSort = state.categories.length;
  for (const name of [...new Set(items.map((i) => i.categoryName))]) {
    if (catByName.has(name)) continue;
    const id = uuid();
    catByName.set(id, id);
    catByName.set(name, id);
    newCats.push({ id, tenant_id: tenantId, name, emoji: items.find((i) => i.categoryName === name)?.categoryEmoji ?? "🍽️", sort_order: catSort++, dirty: 1 });
  }

  let prodSort = state.products.length;
  const newProducts: Product[] = [];
  const newGroups: VariantGroup[] = [];
  for (const item of items) {
    const productId = uuid();
    newProducts.push({
      id: productId,
      tenant_id: tenantId,
      category_id: catByName.get(item.categoryName) ?? null,
      name: item.name,
      base_price: RP(item.basePrice),
      image: null,
      glyph: item.glyph,
      is_active: true,
      sort_order: prodSort++,
      dirty: 1,
      updated_at: new Date().toISOString(),
    });
    item.groups.forEach((g, gi) => {
      newGroups.push({
        id: uuid(),
        tenant_id: tenantId,
        product_id: productId,
        name: g.name,
        multiple: g.multiple,
        required: g.required,
        sort_order: gi,
        dirty: 1,
        options: g.options.map((o, oi) => ({ id: uuid(), name: o.name, price_adjustment: RP(o.priceAdjustment), is_default: Boolean(o.isDefault), sort_order: oi })),
      });
    });
  }

  set({
    categories: [...state.categories, ...newCats].sort((a, b) => a.sort_order - b.sort_order),
    products: [...state.products, ...newProducts].sort((a, b) => a.sort_order - b.sort_order),
    groups: [...state.groups, ...newGroups],
  });
  await persistCatalog();
  queueSync(200);
  toast(`${items.length} menu siap dipakai 🍽️`, "ok");
}

/* ------------------------------------------------------------- catalog CRUD -- */

export type ProductDraft = {
  id?: string;
  name: string;
  base_price: number;
  category_id: string | null;
  glyph: string | null;
  image: string | null;
  is_active: boolean;
  groups: { id?: string; name: string; multiple: boolean; required: boolean; options: VariantOption[] }[];
};

export async function saveProduct(draft: ProductDraft) {
  const tenantId = state.business?.id;
  if (!tenantId) throw new ApiError("Sesi belum siap.", 400);
  const id = draft.id ?? uuid();
  const sort_order = draft.id ? (state.products.find((p) => p.id === draft.id)?.sort_order ?? state.products.length) : state.products.length;
  const product: Product = {
    id,
    tenant_id: tenantId,
    category_id: draft.category_id,
    name: draft.name.trim() || "Menu baru",
    base_price: RP(draft.base_price),
    image: draft.image,
    glyph: draft.glyph,
    is_active: draft.is_active,
    sort_order,
    dirty: 1,
    updated_at: new Date().toISOString(),
  };
  const groups: VariantGroup[] = draft.groups.map((g, gi) => ({
    id: g.id ?? uuid(),
    tenant_id: tenantId,
    product_id: id,
    name: g.name.trim() || "Pilihan",
    multiple: g.multiple,
    required: g.required,
    sort_order: gi,
    dirty: 1,
    options: g.options.map((o, oi) => ({ id: o.id ?? uuid(), name: o.name.trim() || "Opsi", price_adjustment: RP(o.price_adjustment), is_default: o.is_default, sort_order: oi })),
  }));
  const removedGroupIds = state.groups.filter((g) => g.product_id === id && !groups.some((n) => n.id === g.id)).map((g) => g.id);

  set({
    products: draft.id ? state.products.map((p) => (p.id === id ? product : p)) : [product, ...state.products],
    groups: [...state.groups.filter((g) => g.product_id !== id || removedGroupIds.includes(g.id) ? !removedGroupIds.includes(g.id) : false), ...groups].map((g) =>
      g.product_id === id && groups.some((n) => n.id === g.id) ? groups.find((n) => n.id === g.id)! : g,
    ),
  });
  await persistCatalog();
  queueSync(300);
}

export async function deleteProduct(id: string) {
  const product: Product = { ...(state.products.find((p) => p.id === id) as Product), deleted: true, dirty: 1 };
  const groups = state.groups.filter((g) => g.product_id === id).map((g) => ({ ...g, deleted: true, dirty: 1 as const }));
  set({ products: state.products.filter((p) => p.id !== id), groups: [...state.groups.filter((g) => g.product_id !== id), ...groups] });
  await idb.putRecord("products", product as unknown as AnyRecord);
  await idb.putMany("variant_groups", groups as unknown as AnyRecord[]);
  queueSync(200);
}

export async function toggleProductActive(id: string) {
  const target = state.products.find((p) => p.id === id);
  if (!target) return;
  const next = { ...target, is_active: !target.is_active, dirty: 1 as const, updated_at: new Date().toISOString() };
  set({ products: state.products.map((p) => (p.id === id ? next : p)) });
  await idb.putRecord("products", next as unknown as AnyRecord);
  queueSync(300);
}

export async function saveCategory(input: { id?: string; name: string; emoji?: string; sort_order?: number }) {
  const tenantId = state.business?.id;
  if (!tenantId) return;
  const category: Category = {
    id: input.id ?? uuid(),
    tenant_id: tenantId,
    name: input.name.trim() || "Kategori",
    emoji: input.emoji || "🍽️",
    sort_order: input.sort_order ?? state.categories.length,
    dirty: 1,
  };
  set({ categories: input.id ? state.categories.map((c) => (c.id === category.id ? category : c)) : [...state.categories, category] });
  await persistCatalog();
  queueSync(300);
}

export async function deleteCategory(id: string) {
  set({
    categories: state.categories.filter((c) => c.id !== id),
    products: state.products.map((p) => (p.category_id === id ? { ...p, category_id: null, dirty: 1 as const } : p)),
  });
  await persistCatalog();
  queueSync(300);
}

/* -------------------------------------------------------------------- cart -- */

function optionKey(options: TxnOption[]) {
  return options.map((o) => o.name).sort().join("|");
}

export function linePrice(base: number, options: TxnOption[]) {
  return RP(base + options.reduce((sum, o) => sum + RP(o.price_adjustment), 0));
}

export function addToCart(product: Product, options: TxnOption[], qty = 1) {
  const key = `${product.id}::${optionKey(options)}`;
  const existing = state.cart.find((l) => l.line_id === key);
  const line: CartLine = existing
    ? { ...existing, qty: Math.min(999, existing.qty + qty) }
    : { line_id: key, product_id: product.id, name: product.name, glyph: product.glyph, image: product.image, base_price: product.base_price, options, qty, note: "" };
  set({ cart: existing ? state.cart.map((l) => (l.line_id === key ? line : l)) : [...state.cart, line] });
  persistCart();
}

export function setCartQty(lineId: string, qty: number) {
  if (qty <= 0) return removeCartLine(lineId);
  set({ cart: state.cart.map((l) => (l.line_id === lineId ? { ...l, qty: Math.min(999, qty) } : l)) });
  persistCart();
}

export function setCartNote(lineId: string, note: string) {
  set({ cart: state.cart.map((l) => (l.line_id === lineId ? { ...l, note: note.slice(0, 60) } : l)) });
  persistCart();
}

export function removeCartLine(lineId: string) {
  set({ cart: state.cart.filter((l) => l.line_id !== lineId) });
  persistCart();
}

export function clearCart() {
  set({ cart: [], discount: 0 });
  persistCart();
}

export function setDiscount(value: number) {
  set({ discount: RP(value) });
}

export function applyPercentDiscount(percent: number) {
  set({ discount: discountFromPercent(cartTotals().subtotal, percent) });
}

export function cartTotals() {
  const subtotal = RP(state.cart.reduce((sum, l) => sum + linePrice(l.base_price, l.options) * l.qty, 0));
  const discount = Math.min(subtotal, RP(state.discount));
  const total = RP(subtotal - discount);
  const count = state.cart.reduce((n, l) => n + l.qty, 0);
  return { subtotal, discount, total, count };
}

/* ---------------------------------------------------------------- payment -- */

export class InsufficientCash extends Error {}

export async function checkout(input: { cash: number; method: PaymentMethod }) {
  const { subtotal, discount, total } = cartTotals();
  if (total <= 0) throw new InsufficientCash("Keranjang masih kosong.");
  const cash = RP(input.cash);
  if (input.method === "tunai" && cash < total) throw new InsufficientCash("Uang kurang, cek lagi ya.");

  const txn: Txn = {
    id: uuid(),
    tenant_id: state.business!.id,
    device_id: deviceId(),
    items: state.cart.map<TxnItem>((l) => {
      const unit_price = linePrice(l.base_price, l.options);
      return {
        product_id: l.product_id,
        product_name: l.name,
        glyph: l.glyph,
        qty: l.qty,
        base_price: l.base_price,
        unit_price,
        options: l.options,
        variant_label: l.options.map((o) => o.name).join(" · "),
        line_total: RP(unit_price * l.qty),
        note: l.note || undefined,
      };
    }),
    item_count: state.cart.reduce((n, l) => n + l.qty, 0),
    subtotal,
    discount,
    total,
    payment_method: input.method,
    cash_received: input.method === "tunai" ? cash : total,
    change_due: input.method === "tunai" ? RP(Math.max(0, cash - total)) : 0,
    note: null,
    customer_name: null,
    cashier_name: state.user?.name ?? null,
    created_at: new Date().toISOString(),
    synced: 0,
    dirty: 1,
  };

  // Synchronously update state and clear cart so UI updates instantly, persist & save in background
  set({ transactions: [txn, ...state.transactions], lastTxn: txn, cart: [], discount: 0 });
  persistCart();
  void saveTxn(txn).catch((err) => console.error("Failed to save txn locally", err));
  queueSync(150);
  return txn;
}

export async function setTxnNote(id: string, note: string) {
  const target = state.transactions.find((t) => t.id === id);
  if (!target) return;
  const next = { ...target, note: note.slice(0, 200), synced: 0 as const };
  set({ transactions: state.transactions.map((t) => (t.id === id ? next : t)), lastTxn: state.lastTxn?.id === id ? next : state.lastTxn });
  await saveTxn(next);
}

/** Wipe the on-device copy (the server keeps the durable record). */
export async function clearAllCache() {
  const tenantId = state.business?.id;
  await idb.clearAllLocal();
  if (tenantId && state.user) {
    await idb.setMeta("activeTenant", tenantId);
    await idb.setMeta("user", state.user);
    if (state.business) await idb.setMeta("business", state.business);
  }
  set({ categories: [], products: [], groups: [], transactions: [], cart: [] });
  toast("Cache dibersihkan — menarik ulang dari server…", "info");
  await syncNow({ silent: true });
}

export function exportBackup(): string {
  return JSON.stringify(
    { app: "KasirKu", exported_at: new Date().toISOString(), tenant: state.business?.id, business: state.business, categories: state.categories, products: state.products, groups: state.groups, transactions: state.transactions },
    null,
    2,
  );
}
