import type { BusinessTypeKey } from "@/lib/menu-templates";

export type TenantUser = { id: string; name: string; email: string; role: string; tenant_id: string };

export type Business = {
  id: string;
  business_name: string;
  business_type: BusinessTypeKey;
  address: string | null;
  phone: string | null;
  logo: string | null;
  receipt_footer: string | null;
  subscription_tier: "free" | "umkm" | "pro";
  created_at?: string;
};

export type Category = {
  id: string;
  tenant_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  deleted?: boolean;
  dirty?: 0 | 1;
  updated_at?: string;
};

export type VariantOption = {
  id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  sort_order: number;
};

export type VariantGroup = {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  multiple: boolean;
  required: boolean;
  sort_order: number;
  deleted?: boolean;
  dirty?: 0 | 1;
  options: VariantOption[];
};

export type Product = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  base_price: number;
  image: string | null;
  glyph: string | null;
  is_active: boolean;
  sort_order: number;
  deleted?: boolean;
  dirty?: 0 | 1;
  updated_at?: string;
};

export type TxnOption = { group: string; name: string; price_adjustment: number };

export type TxnItem = {
  product_id: string;
  product_name: string;
  glyph: string | null;
  qty: number;
  base_price: number;
  unit_price: number;
  options: TxnOption[];
  variant_label: string;
  line_total: number;
  note?: string;
};

export type PaymentMethod = "tunai" | "qris" | "transfer" | "lain";

/** Append-only ledger row. `synced` is the only field the client mutates. */
export type Txn = {
  id: string;
  tenant_id: string;
  device_id: string;
  items: TxnItem[];
  item_count: number;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  cash_received: number;
  change_due: number;
  note: string | null;
  customer_name: string | null;
  cashier_name: string | null;
  created_at: string;
  synced: 0 | 1;
  dirty?: 0 | 1;
};

export type CartLine = {
  line_id: string;
  product_id: string;
  name: string;
  glyph: string | null;
  image: string | null;
  base_price: number;
  options: TxnOption[];
  qty: number;
  note: string;
};
