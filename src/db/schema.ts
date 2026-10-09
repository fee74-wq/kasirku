/**
 * KasirKu — schema multi-tenant.
 *
 * MULTI-TENANCY RULE (strict):
 *  every tenant-owned row carries `tenant_id` and every query in the API layer
 *  MUST filter by it. Nothing is ever read/updated without the tenant scope of
 *  the authenticated session. `transactions` is append-only: rows are inserted
 *  (idempotently, keyed by the client-generated uuid) and never updated/deleted
 *  so they can be replayed safely when the sync engine (Tahap 2) lands.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessName: text("business_name").notNull(),
    businessType: text("business_type").notNull().default("lainnya"),
    address: text("address"),
    phone: text("phone"),
    logo: text("logo"), // data-url (uploaded on device) or remote url
    receiptFooter: text("receipt_footer"),
    currency: text("currency").notNull().default("IDR"),
    locale: text("locale").notNull().default("id-ID"),
    subscriptionTier: text("subscription_tier").notNull().default("free"),
    subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("businesses_name_idx").on(t.businessName)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"), // null for google-only accounts
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_unique_idx").on(t.email), index("users_tenant_idx").on(t.tenantId)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji").notNull().default("🍽️"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("categories_tenant_idx").on(t.tenantId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    basePrice: integer("base_price").notNull(), // whole rupiah, never float
    image: text("image"), // data-url uploaded from device
    glyph: text("glyph"), // emoji fallback used on low-end devices / offline
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("products_tenant_idx").on(t.tenantId), index("products_category_idx").on(t.categoryId)],
);

/** A choice block shown in the POS variant modal, e.g. "Level Pedas" or "Topping". */
export const variantGroups = pgTable(
  "variant_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    multiple: boolean("multiple").notNull().default(false), // false = single choice, true = add-ons
    required: boolean("required").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("variant_groups_tenant_idx").on(t.tenantId), index("variant_groups_product_idx").on(t.productId)],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => variantGroups.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceAdjustment: integer("price_adjustment").notNull().default(0), // +/- whole rupiah
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("variants_tenant_idx").on(t.tenantId), index("variants_group_idx").on(t.groupId)],
);

/** APPEND-ONLY sales ledger. `id` is generated on-device so retries stay idempotent. */
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    items: jsonb("items").notNull(), // [{product_id, product_name, qty, unit_price, options, line_total}]
    itemCount: integer("item_count").notNull().default(0),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method").notNull().default("tunai"),
    cashReceived: integer("cash_received").notNull().default(0),
    changeDue: integer("change_due").notNull().default(0),
    note: text("note"),
    customerName: text("customer_name"),
    cashierName: text("cashier_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("transactions_tenant_time_idx").on(t.tenantId, t.createdAt),
    index("transactions_device_idx").on(t.deviceId),
  ],
);

/** Durable per-tenant event log — the seam where Tahap-2 conflict resolution hooks in. */
export const syncEvents = pgTable(
  "sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    op: text("op").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sync_events_tenant_time_idx").on(t.tenantId, t.createdAt)],
);

export type Business = typeof businesses.$inferSelect;
export type User = typeof users.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type VariantGroupRow = typeof variantGroups.$inferSelect;
export type VariantRow = typeof variants.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
