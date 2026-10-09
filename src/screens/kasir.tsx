"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, Sheet, Stepper, TextInput, cx, EmptyState, IconButton } from "@/components/ui";
import { IconBowl, IconChevron, IconNote, IconSearch, IconTrash } from "@/components/icons";
import { PaymentSheet } from "@/components/payment";
import { addToCart, applyTemplateLocally, cartTotals, clearCart, removeCartLine, setCartNote, setCartQty, setDiscount, toggleProductActive, useAppState } from "@/lib/store";
import { formatRp, digitsToRp, rpToDigits } from "@/lib/money";
import { getTemplate } from "@/lib/menu-templates";
import { vibrate } from "@/lib/device";
import type { Product, TxnOption, VariantGroup } from "@/lib/types";
import { askConfirm } from "@/components/confirm";

export function KasirScreen() {
  const app = useAppState();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [variantFor, setVariantFor] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const totals = cartTotals();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return app.products
      .filter((p) => p.is_active)
      .filter((p) => (category === "all" ? true : p.category_id === category))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [app.products, category, query]);

  const groupsOf = (productId: string) => app.groups.filter((g) => g.product_id === productId && !g.deleted);
  const qtyInCart = (productId: string) => app.cart.filter((l) => l.product_id === productId).reduce((n, l) => n + l.qty, 0);

  function tapProduct(p: Product) {
    const groups = groupsOf(p.id);
    if (groups.length === 0) {
      addToCart(p, [], 1);
      vibrate(10);
      return;
    }
    setVariantFor(p);
  }

  /** thumb shortcut: press & hold a plain item to drop 5 portions in one go */
  function holdProduct(p: Product) {
    if (groupsOf(p.id).length > 0) {
      setVariantFor(p);
      return;
    }
    addToCart(p, [], 5);
    vibrate([8, 30, 10]);
  }

  return (
    <div className="relative">
      {/* search + categories */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 border-b border-line/50 bg-base/88 px-4 pb-2.5 pt-2 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari menu…"
              className="h-11 py-0 pl-10 text-[15px]"
              inputMode="search"
              aria-label="Cari menu"
            />
          </div>
          <IconButton label="Buka keranjang" onClick={() => setCartOpen(true)} className={cx("relative h-11 w-11", totals.count > 0 && "border-turmeric/60 bg-turmeric/15 text-[#8a610c]")}>
            <IconBowl size={20} />
            {totals.count > 0 && (
              <span className="pop-in tabular absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-pill bg-chili px-1 text-[11px] font-black text-white">{totals.count}</span>
            )}
          </IconButton>
        </div>

        <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            Semua
          </Chip>
          {app.categories.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              <span className="mr-1">{c.emoji}</span>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconBowl size={26} />}
          title={app.products.length === 0 ? "Belum ada menu aktif" : "Menu tidak ketemu"}
          desc={app.products.length === 0 ? "Muat starter menu sesuai jenis usaha kamu, atau tambahkan manual." : "Coba kata kunci lain atau ganti kategori."}
          action={
            app.products.length === 0 ? (
              <Button size="md" onClick={() => void applyTemplateLocally(app.business?.business_type ?? "lainnya", { replace: false })}>
                Muat menu template
              </Button>
            ) : (
              <Button size="md" variant="secondary" onClick={() => { setQuery(""); setCategory("all"); }}>
                Reset filter
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {visible.map((p, i) => (
            <ProductTile
              key={p.id}
              product={p}
              index={i}
              accent={getTemplate(app.business?.business_type).accent}
              qty={qtyInCart(p.id)}
              hasVariants={groupsOf(p.id).length > 0}
              variantSummary={groupsOf(p.id)
                .slice(0, 2)
                .map((g) => g.name)
                .join(" · ")}
              onTap={() => tapProduct(p)}
              onLongPress={() => holdProduct(p)}
            />
          ))}
        </div>
      )}

      <VariantSheet product={variantFor} groups={variantFor ? groupsOf(variantFor.id) : []} accent={getTemplate(app.business?.business_type).accent} onClose={() => setVariantFor(null)} />

      <Sheet
        open={cartOpen && !payOpen}
        onClose={() => setCartOpen(false)}
        title="Keranjang"
        subtitle={`${totals.count} item · ${app.business?.business_name ?? ""}`}
        size="full"
        footer={
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between text-[13.5px] font-bold text-muted">
              <span>Subtotal {formatRp(totals.subtotal)}{totals.discount > 0 ? ` − diskon ${formatRp(totals.discount)}` : ""}</span>
              <span className="tabular text-[19px] font-extrabold text-ink">{formatRp(totals.total)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" icon={<IconTrash size={17} />} onClick={() => askConfirm({ title: "Kosongkan keranjang?", desc: `${totals.count} item akan dihapus dari antrean bayar.`, okLabel: "Kosongkan", tone: "danger", onOk: () => clearCart() })}>
                Kosongkan
              </Button>
              <Button
                size="lg"
                full
                disabled={totals.count === 0}
                onClick={() => {
                  setCartOpen(false);
                  setPayOpen(true);
                }}
              >
                Bayar · {formatRp(totals.total)}
              </Button>
            </div>
          </div>
        }
      >
        {app.cart.length === 0 ? (
          <EmptyState icon={<IconBowl size={24} />} title="Keranjang kosong" desc="Ketuk menu di layar kasir untuk menambah pesanan." />
        ) : (
          <div className="space-y-2.5">
            {app.cart.map((l) => {
              const unit = unitPrice(l.base_price, l.options);
              return (
                <Card key={l.line_id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-elevated text-[21px]">{l.glyph ?? "🍽️"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-extrabold leading-tight">{l.name}</p>
                      {l.options.length > 0 && <p className="mt-0.5 text-[12px] font-semibold text-muted">{l.options.map((o) => `${o.name}${o.price_adjustment ? ` ${o.price_adjustment > 0 ? "+" : "−"}${formatRp(Math.abs(o.price_adjustment))}` : ""}`).join(" · ")}</p>}
                      {l.note && <p className="mt-0.5 text-[12px] font-semibold text-turmeric">* {l.note}</p>}
                      <p className="tabular mt-1 text-[13px] font-bold text-ink">{formatRp(unit * l.qty)}</p>
                    </div>
                    <button onClick={() => removeCartLine(l.line_id)} aria-label={`Hapus ${l.name}`} className="press grid h-8 w-8 place-items-center rounded-lg text-muted active:bg-raised">
                      <IconTrash size={17} />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <LineNote lineId={l.line_id} note={l.note} />
                    <Stepper value={l.qty} onChange={(v) => setCartQty(l.line_id, v)} min={1} />
                  </div>
                </Card>
              );
            })}

            <Card className="p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-extrabold">Diskon kasir</p>
                <span className="tabular text-[15px] font-extrabold text-turmeric">−{formatRp(totals.discount)}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {[0, 5, 10].map((pct) => (
                  <Chip key={pct} active={totals.discount === (pct === 0 ? 0 : Math.round((totals.subtotal * pct) / 100))} onClick={() => applyPercentDiscountSafe(pct, totals.subtotal)}>
                    {pct === 0 ? "Tanpa diskon" : `${pct}%`}
                  </Chip>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-muted">Rp</span>
                  <TextInput
                    className="tabular h-10 w-24 px-2.5 py-0 text-[15px]"
                    inputMode="numeric"
                    value={app.discount ? rpToDigits(app.discount) : ""}
                    onChange={(e) => setDiscount(digitsToRp(e.target.value.replace(/\D/g, "")))}
                    placeholder="0"
                    aria-label="Diskon dalam rupiah"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}
      </Sheet>

      <PaymentSheet open={payOpen} onClose={() => setPayOpen(false)} />

      {/* sticky cart bar */}
      {totals.count > 0 && !cartOpen && !payOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 mx-auto flex w-full max-w-[560px] justify-center px-4">
          <div className="pop-in pointer-events-auto flex w-full items-stretch gap-2 rounded-[22px] border border-turmeric/40 bg-gradient-to-r from-chili to-[#e2542f] p-2 text-white shadow-[0_18px_40px_-16px_rgba(255,90,54,0.8)]">
            <button onClick={() => setCartOpen(true)} className="press flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1.5 text-left active:bg-white/10" aria-label="Lihat keranjang">
              <span className="tabular grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/18 text-[16px] font-black">{totals.count}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-white/85">Keranjang · ubah</span>
                <span className="tabular block truncate text-[20px] font-extrabold leading-tight">{formatRp(totals.total)}</span>
              </span>
            </button>
            <button
              onClick={() => setPayOpen(true)}
              className="press flex shrink-0 items-center gap-2 rounded-2xl bg-ink px-5 text-[16px] font-black text-[#1d140a] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)]"
            >
              Bayar <IconChevron size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function unitPrice(base: number, options: TxnOption[]) {
  return Math.max(0, Math.round(base + options.reduce((s, o) => s + Math.round(o.price_adjustment || 0), 0)));
}

function applyPercentDiscountSafe(percent: number, subtotal: number) {
  if (percent === 0) {
    setDiscount(0);
    return;
  }
  // integer-only rounding at the single discount boundary
  setDiscount(Math.round((subtotal * percent) / 100));
}

function LineNote({ lineId, note }: { lineId: string; note: string }) {
  const [open, setOpen] = useState(Boolean(note));
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="press inline-flex items-center gap-1.5 rounded-pill border border-line/70 px-2.5 py-1.5 text-[12px] font-bold text-muted active:bg-raised">
        <IconNote size={14} /> Catatan
      </button>
    );
  return (
    <TextInput autoFocus value={note} onChange={(e) => setCartNote(lineId, e.target.value)} onBlur={() => setOpen(false)} placeholder="tanpa cabai, bungkus…" className="h-10 flex-1 px-3 py-0 text-[13.5px]" aria-label="Catatan item" />
  );
}

function ProductTile({
  product,
  index,
  accent,
  qty,
  hasVariants,
  variantSummary,
  onTap,
  onLongPress,
}: {
  product: Product;
  index: number;
  accent: [string, string];
  qty: number;
  hasVariants: boolean;
  variantSummary: string;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const [hold, setHold] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  return (
    <button
      onClick={onTap}
      title="Ketuk = tambah 1 · tekan lama = tambah 5"
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
      onTouchStart={() => {
        timer.current = window.setTimeout(() => {
          setHold(true);
          onLongPress();
          vibrate(25);
        }, 520);
      }}
      onTouchEnd={() => window.clearTimeout(timer.current)}
      onTouchMove={() => window.clearTimeout(timer.current)}
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms`, backgroundImage: `linear-gradient(160deg, ${accent[0]}24, ${accent[1]}0e)` }}
      className={cx("reveal press grain relative flex flex-col overflow-hidden rounded-card border border-line/60 bg-surface/70 p-2.5 text-left", hold && "border-turmeric")}
    >
      <span className="relative mb-2 grid aspect-4/3 w-full place-items-center overflow-hidden rounded-[14px]" style={{ backgroundImage: `linear-gradient(150deg, ${accent[0]}, ${accent[1]})` }}>
        {product.image ? (
          <img src={product.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[38px] leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]">{product.glyph ?? "🍽️"}</span>
        )}
        {qty > 0 && <span className="tabular pop-in absolute right-1.5 top-1.5 grid h-6 min-w-6 place-items-center rounded-pill bg-turmeric px-1.5 text-[12px] font-black text-[#2b1c02]">{qty}</span>}
        {!product.is_active && <span className="absolute inset-x-1.5 bottom-1.5 rounded-pill bg-[#0d0a07]/80 px-2 py-0.5 text-center text-[10.5px] font-black uppercase text-turmeric">Nonaktif</span>}
      </span>
      <span className="line-clamp-2 text-[14.5px] font-extrabold leading-snug">{product.name}</span>
      <span className="tabular mt-1 text-[14px] font-extrabold text-turmeric">{formatRp(product.base_price)}</span>
      {hasVariants && <span className="mt-1 truncate text-[11px] font-bold text-muted">{variantSummary}</span>}
    </button>
  );
}

/* ------------------------------------------------------------ variant sheet */

function VariantSheet({ product, groups, accent, onClose }: { product: Product | null; groups: VariantGroup[]; accent: [string, string]; onClose: () => void }) {
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    // re-seed defaults whenever a different product sheet opens
    if (!product) return;
    const next: Record<string, string[]> = {};
    for (const g of groups) {
      const defaults = g.options.filter((o) => o.is_default).map((o) => o.id);
      next[g.id] = g.multiple ? defaults : defaults.slice(0, 1);
    }
    setSel(next);
    setQty(1);
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;
  const options: TxnOption[] = groups.flatMap((g) => (sel[g.id] ?? []).flatMap((id) => {
    const o = g.options.find((x) => x.id === id);
    return o ? [{ group: g.name, name: o.name, price_adjustment: o.price_adjustment }] : [];
  }));
  const unit = unitPrice(product.base_price, options);
  const missing = groups.filter((g) => g.required && (sel[g.id] ?? []).length === 0);

  function toggle(g: VariantGroup, id: string) {
    setSel((s) => {
      const cur = s[g.id] ?? [];
      if (g.multiple) return { ...s, [g.id]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
      return { ...s, [g.id]: cur.includes(id) ? [] : [id] };
    });
    vibrate(8);
  }

  function add() {
    if (!product) return;
    addToCart(product, options, qty);
    vibrate([10, 30, 14]);
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      subtitle={`${formatRp(product.base_price)} dasar · ${groups.length} pilihan`}
      size="lg"
      footer={
        <div className="flex items-center gap-2.5">
          <Stepper value={qty} onChange={setQty} min={1} max={99} />
          <Button full size="lg" disabled={missing.length > 0} onClick={add}>
            {missing.length > 0 ? `Pilih ${missing[0].name} dulu` : `Masukkan ${qty} ke keranjang · ${formatRp(unit * qty)}`}
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-3 overflow-hidden rounded-card border border-line/70 bg-elevated/50 p-2.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl text-[26px]" style={{ backgroundImage: `linear-gradient(150deg, ${accent[0]}, ${accent[1]})` }}>
          {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : product.glyph ?? "🍽️"}
        </span>
        <div className="min-w-0">
          <p className="tabular text-[19px] font-extrabold leading-tight">{formatRp(unit)}</p>
          <p className="text-[12px] font-semibold text-muted">{options.length > 0 ? options.map((o) => o.name).join(" · ") : "Tanpa varian"}</p>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.id} className="mb-4">
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-[14.5px]">{g.name}</h3>
            <span className={cx("rounded-pill px-2 py-0.5 text-[10.5px] font-black uppercase", g.required ? "bg-chili/15 text-chili" : "bg-raised text-muted")}>
              {g.required ? "wajib" : g.multiple ? "boleh banyak" : "opsional"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => {
              const active = (sel[g.id] ?? []).includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggle(g, o.id)}
                  className={cx(
                    "press flex min-h-11 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[14px] font-bold",
                    active ? "border-transparent bg-ink text-base shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)]" : "border-line/80 bg-surface text-ink",
                  )}
                >
                  {o.name}
                  {o.price_adjustment !== 0 && (
                    <span className={cx("tabular text-[12px] font-extrabold", active ? "text-turmeric" : "text-muted")}>
                      {o.price_adjustment > 0 ? "+" : "−"}
                      {formatRp(Math.abs(o.price_adjustment)).replace("Rp", "")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk dapur (mis. jangan cabe)" className="h-12 text-[15px]" aria-label="Catatan pesanan" />
    </Sheet>
  );
}
