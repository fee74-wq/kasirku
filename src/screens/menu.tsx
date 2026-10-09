"use client";

import { useMemo, useState } from "react";
import { Button, Card, Chip, EmptyState, Field, IconButton, MoneyInput, Sheet, TextInput, Toggle, cx } from "@/components/ui";
import { IconBowl, IconCamera, IconCheck, IconClose, IconEdit, IconGrid, IconPlus, IconTag, IconTrash } from "@/components/icons";
import { askConfirm } from "@/components/confirm";
import { deleteCategory, deleteProduct, saveCategory, saveProduct, toggleProductActive, applyTemplateLocally, useAppState, type ProductDraft } from "@/lib/store";
import { digitsToRp, formatRp, rpToDigits } from "@/lib/money";
import { fileToDataUrl } from "@/lib/image";
import { getTemplate } from "@/lib/menu-templates";
import type { VariantOption } from "@/lib/types";

const GLYPHS = ["🍜", "🥘", "🍛", "🍗", "🧋", "☕", "🍢", "🍚", "🥤", "🌶️", "🍤", "🥟", "🍕", "🍔", "🥗", "🍦", "🫔", "🥞", "🍳", "🧉"];

export function MenuScreen() {
  const app = useAppState();
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [catSheet, setCatSheet] = useState(false);
  const accent = getTemplate(app.business?.business_type).accent;

  const grouped = useMemo(() => {
    const byCat = new Map<string | null, typeof app.products>();
    for (const p of app.products.filter((x) => !x.deleted)) {
      const key = p.category_id && app.categories.some((c) => c.id === p.category_id) ? p.category_id : null;
      byCat.set(key, [...(byCat.get(key) ?? []), p]);
    }
    return [
      ...app.categories.map((c) => ({ category: c as { id: string; name: string; emoji: string } | null, items: (byCat.get(c.id) ?? []).sort((a, b) => a.sort_order - b.sort_order) })),
      ...(byCat.get(null) ? [{ category: null, items: (byCat.get(null) ?? []).sort((a, b) => a.sort_order - b.sort_order) } as const] : []),
    ].filter((g) => g.items.length > 0);
  }, [app.products, app.categories]);

  const groupsFor = (productId: string) => app.groups.filter((g) => g.product_id === productId && !g.deleted);

  function startNew() {
    setEditing({ name: "", base_price: 0, category_id: app.categories[0]?.id ?? null, glyph: GLYPHS[0], image: null, is_active: true, groups: [] });
  }

  function startEdit(id: string) {
    const p = app.products.find((x) => x.id === id);
    if (!p) return;
    setEditing({
      id: p.id,
      name: p.name,
      base_price: p.base_price,
      category_id: p.category_id,
      glyph: p.glyph ?? GLYPHS[0],
      image: p.image,
      is_active: p.is_active,
      groups: groupsFor(p.id).map((g) => ({ id: g.id, name: g.name, multiple: g.multiple, required: g.required, options: g.options })),
    });
  }

  return (
    <div className="relative pb-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-muted">Kelola menu</p>
          <h1 className="text-[26px] leading-tight">{app.products.length} menu aktif {app.products.filter((p) => !p.is_active).length > 0 && <span className="text-[14px] font-bold text-muted">({app.products.filter((p) => !p.is_active).length} nonaktif)</span>}</h1>
        </div>
        <Button size="md" icon={<IconPlus size={18} />} onClick={startNew}>
          Menu
        </Button>
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        <Chip onClick={() => setCatSheet(true)}>
          <IconGrid size={14} className="mr-1 inline" /> {app.categories.length} kategori
        </Chip>
        <Chip
          onClick={() =>
            askConfirm({
              title: "Muat menu template?",
              desc: `Item dari template "${getTemplate(app.business?.business_type).label}" yang belum ada akan ditambahkan ke menu kamu.`,
              okLabel: "Muat sekarang",
              onOk: () => void applyTemplateLocally(app.business?.business_type ?? "lainnya", { replace: false }),
            })
          }
        >
          <IconTag size={14} className="mr-1 inline" /> Tambah dari template
        </Chip>
        <Chip
          onClick={() =>
            askConfirm({
              title: "Balikin ke menu template?",
              desc: "Semua menu, kategori, dan varian buatanmu dihapus lalu diganti menu bawaan. Riwayat transaksi tetap aman (tidak pernah dihapus).",
              okLabel: "Reset menu",
              tone: "danger",
              onOk: () => void applyTemplateLocally(app.business?.business_type ?? "lainnya", { replace: true }).then(() => saveCategory({ name: "Catatan", emoji: "📝" })).catch(() => undefined),
            })
          }
        >
          Reset ke template
        </Chip>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconBowl size={26} />}
            title="Menu masih kosong"
            desc="Tambahkan satu per satu, atau muat starter menu sesuai jenis usaha kamu."
            action={<Button onClick={() => void applyTemplateLocally(app.business?.business_type ?? "lainnya", { replace: true })}>Muat menu template</Button>}
          />
        </div>
      ) : (
        grouped.map((g) => (
          <section key={g.category?.id ?? "none"} className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] uppercase tracking-[0.14em] text-muted">
              <span className="text-[15px]">{g.category?.emoji ?? "🗂️"}</span>
              {g.category?.name ?? "Tanpa kategori"}
              <span className="tabular text-[11px] text-muted/70">{g.items.length}</span>
            </h2>
            <div className="space-y-2">
              {g.items.map((p, i) => {
                const groups = groupsFor(p.id);
                return (
                  <Card key={p.id} className={cx("reveal flex items-center gap-3 p-2.5", !p.is_active && "opacity-60")} >
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl text-[22px]" style={{ backgroundImage: `linear-gradient(150deg, ${accent[0]}30, ${accent[1]}12)` }}>
                      {p.image ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : p.glyph ?? "🍽️"}
                    </span>
                    <button onClick={() => startEdit(p.id)} className="press min-w-0 flex-1 text-left active:opacity-70">
                      <p className="truncate text-[15px] font-extrabold">{p.name}</p>
                      <p className="tabular mt-0.5 text-[13px] font-bold text-turmeric">{formatRp(p.base_price)}</p>
                      <p className="mt-0.5 truncate text-[11.5px] font-semibold text-muted">
                        {groups.length > 0 ? groups.map((x) => `${x.name} (${x.options.length})`).join(" · ") : "tanpa varian"} · urut {i + 1}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Toggle checked={p.is_active} onChange={() => void toggleProductActive(p.id)} label={`Aktifkan ${p.name}`} />
                      <div className="flex gap-1.5">
                        <IconButton label={`Ubah ${p.name}`} onClick={() => startEdit(p.id)} className="h-8 w-8">
                          <IconEdit size={15} />
                        </IconButton>
                        <IconButton
                          label={`Hapus ${p.name}`}
                          className="h-8 w-8"
                          onClick={() =>
                            askConfirm({
                              title: `Hapus ${p.name}?`,
                              desc: "Menu hilang dari kasir. Transaksi lama yang memakai menu ini tetap tercatat.",
                              okLabel: "Hapus menu",
                              tone: "danger",
                              onOk: () => void deleteProduct(p.id),
                            })
                          }
                        >
                          <IconTrash size={15} />
                        </IconButton>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <ProductEditor draft={editing} onClose={() => setEditing(null)} />
      <CategorySheet open={catSheet} onClose={() => setCatSheet(false)} />
    </div>
  );
}

/* -------------------------------------------------------------- editor -- */

function ProductEditor({ draft, onClose }: { draft: ProductDraft | null; onClose: () => void }) {
  const app = useAppState();
  const [form, setForm] = useState<ProductDraft | null>(draft);
  const [error, setError] = useState<string | null>(null);

  // keep the local form in sync when a different product is opened
  if (draft && form?.id !== draft.id) setForm(draft);
  if (!draft || !form) return null;

  const patch = (p: Partial<ProductDraft>) => setForm((f) => (f ? { ...f, ...p } : f));
  const patchGroup = (gi: number, p: Partial<ProductDraft["groups"][number]>) =>
    setForm((f) => (f ? { ...f, groups: f.groups.map((g, i) => (i === gi ? { ...g, ...p } : g)) } : f));
  const patchOption = (gi: number, oi: number, p: Partial<VariantOption>) =>
    setForm((f) => (f ? { ...f, groups: f.groups.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...p } : o)) } : g)) } : f));

  async function pickImage(file?: File) {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 420, 0.72);
      patch({ image: url });
    } catch {
      setError("Foto tidak bisa diproses, pakai emoji dulu ya.");
    }
  }

  function save() {
    if (!form) return;
    if (form.name.trim().length < 2) {
      setError("Nama menu minimal 2 karakter.");
      return;
    }
    if (form.base_price <= 0) {
      setError("Harga dasar harus lebih dari nol.");
      return;
    }
    setError(null);
    void saveProduct({
      ...form,
      name: form.name.trim(),
      groups: form.groups
        .filter((g) => g.name.trim() && g.options.filter((o) => o.name.trim()).length > 0)
        .map((g) => ({ ...g, name: g.name.trim(), options: g.options.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim() })) })),
    }).then(onClose).catch(() => setError("Gagal menyimpan. Coba lagi."));
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={draft?.id ? "Ubah menu" : "Tambah menu"}
      subtitle={draft?.id ? "Perubahan langsung tersimpan di HP & tersinkron" : "Isi nama, harga, lalu varian/topping"}
      size="full"
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Batal
          </Button>
          <Button size="lg" full icon={<IconCheck size={18} />} onClick={save}>
            Simpan menu
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="relative">
            <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-line/70 bg-elevated/60 text-[34px]" style={{ backgroundImage: form.image ? `url(${form.image})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
              {!form.image && (form.glyph ?? "🍽️")}
            </span>
            <label className="press absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-line bg-surface text-muted active:bg-raised">
              <IconCamera size={16} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0])} aria-label="Upload foto menu" />
            </label>
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <Field label="Nama menu" required>
              <TextInput value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Seblak Ceker Komplit" maxLength={60} />
            </Field>
            <Field label="Harga dasar (Rp)" required hint="angka bulat, tanpa koma">
              <div className="flex gap-1.5">
                <MoneyInput value={form.base_price ? rpToDigits(form.base_price) : ""} onChange={(e) => patch({ base_price: digitsToRp(e.target.value.replace(/\D/g, "")) })} placeholder="12000" className="tabular" />
                {[1000, 5000].map((n) => (
                  <button key={n} onClick={() => patch({ base_price: form.base_price + n })} className="press tabular h-13 shrink-0 rounded-2xl border border-line/80 bg-raised px-2.5 text-[13px] font-bold text-muted active:bg-elevated">
                    +{n / 1000}rb
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[12.5px] font-bold uppercase tracking-wide text-muted">Ikon menu</p>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => patch({ image: null })} className={cx("press h-10 rounded-xl border px-3 text-[12px] font-bold", !form.image && !form.glyph ? "border-turmeric bg-turmeric/15" : "border-line/70 bg-surface text-muted")}>
              tanpa ikon
            </button>
            {GLYPHS.map((g) => (
              <button key={g} onClick={() => patch({ glyph: g, image: null })} className={cx("press grid h-10 w-10 place-items-center rounded-xl border text-[20px]", form.glyph === g && !form.image ? "border-turmeric bg-turmeric/15" : "border-line/70 bg-surface")}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <Field label="Kategori">
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!form.category_id} onClick={() => patch({ category_id: null })}>
              Tanpa kategori
            </Chip>
            {app.categories.map((c) => (
              <Chip key={c.id} active={form.category_id === c.id} onClick={() => patch({ category_id: c.id })}>
                {c.emoji} {c.name}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-2xl border border-line/70 bg-surface px-3.5 py-3">
          <div>
            <p className="text-[14.5px] font-extrabold">Tampilkan di kasir</p>
            <p className="text-[12px] font-semibold text-muted">Matikan kalau stok habis tanpa menghapus menu.</p>
          </div>
          <Toggle checked={form.is_active} onChange={(v) => patch({ is_active: v })} label="Aktif di kasir" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">Pilihan / varian / topping</p>
            <button
              onClick={() => patch({ groups: [...form.groups, { name: "", multiple: false, required: true, options: [{ id: cryptoId(), name: "", price_adjustment: 0, is_default: true, sort_order: 0 }, { id: cryptoId(), name: "", price_adjustment: 0, is_default: false, sort_order: 1 }] }] })}
              className="press rounded-pill border border-line/80 bg-raised px-3 py-1.5 text-[12.5px] font-bold active:bg-elevated"
            >
              + Tambah kelompok
            </button>
          </div>

          {form.groups.length === 0 && <p className="mt-2 rounded-2xl border border-dashed border-line/70 bg-surface/60 px-3.5 py-3 text-[12.5px] font-semibold text-muted">Belum ada varian. Contoh: kelompok “Level Pedas” (pilih satu) atau “Topping” (boleh banyak, ada tambahan harga).</p>}

          <div className="mt-2.5 space-y-2.5">
            {form.groups.map((g, gi) => (
              <Card key={g.id ?? gi} className="p-3.5">
                <div className="flex items-center gap-2">
                  <TextInput value={g.name} onChange={(e) => patchGroup(gi, { name: e.target.value })} placeholder="Nama kelompok, mis. Ukuran" className="h-11 flex-1 text-[14.5px]" />
                  <IconButton label="Hapus kelompok" className="h-11 w-11 shrink-0" onClick={() => patch({ groups: form.groups.filter((_, i) => i !== gi) })}>
                    <IconTrash size={17} />
                  </IconButton>
                </div>
                <div className="mt-2 flex gap-2">
                  <Chip active={!g.multiple} onClick={() => patchGroup(gi, { multiple: false })}>
                    Pilih satu
                  </Chip>
                  <Chip active={g.multiple} onClick={() => patchGroup(gi, { multiple: true })}>
                    Boleh banyak
                  </Chip>
                  <Chip active={g.required} onClick={() => patchGroup(gi, { required: !g.required })}>
                    {g.required ? "Wajib dipilih" : "Boleh kosong"}
                  </Chip>
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {g.options.map((o, oi) => (
                    <div key={o.id} className="flex items-center gap-1.5">
                      <button
                        onClick={() => patchGroup(gi, { options: g.options.map((x, j) => ({ ...x, is_default: j === oi })) })}
                        aria-label={`Jadikan default: ${o.name || "opsi"}`}
                        className={cx("press grid h-9 w-9 shrink-0 place-items-center rounded-lg border", o.is_default ? "border-pandan bg-pandan/18 text-pandan" : "border-line/70 text-muted")}
                      >
                        <IconCheck size={15} />
                      </button>
                      <TextInput value={o.name} onChange={(e) => patchOption(gi, oi, { name: e.target.value })} placeholder="Nama opsi (mis. Large)" className="h-9 flex-1 px-2.5 py-0 text-[14px]" />
                      <div className="flex w-[92px] shrink-0 items-center gap-1 rounded-xl border border-line/70 bg-surface px-2">
                        <span className="text-[12px] font-bold text-muted">Rp</span>
                        <input
                          value={o.price_adjustment ? String(o.price_adjustment) : ""}
                          onChange={(e) => {
                            const neg = e.target.value.trim().startsWith("-");
                            patchOption(gi, oi, { price_adjustment: (neg ? -1 : 1) * digitsToRp(e.target.value.replace(/\D/g, "")) });
                          }}
                          inputMode="numeric"
                          placeholder="0"
                          aria-label="Tambahan harga"
                          className="tabular h-9 w-full bg-transparent text-[13.5px] font-bold outline-none"
                        />
                      </div>
                      <button onClick={() => patchGroup(gi, { options: g.options.filter((_, j) => j !== oi) })} aria-label="Hapus opsi" className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted active:bg-raised">
                        <IconClose size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => patchGroup(gi, { options: [...g.options, { id: cryptoId(), name: "", price_adjustment: 0, is_default: false, sort_order: g.options.length }] })} className="press w-full rounded-xl border border-dashed border-line/70 py-2 text-[12.5px] font-bold text-muted active:bg-raised">
                    + tambah opsi
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {error && <p className="rounded-2xl border border-[#8e2f22] bg-[#3b1109]/70 px-3.5 py-2.5 text-[13px] font-bold text-[#ffd9cf]">{error}</p>}
      </div>
    </Sheet>
  );
}

function cryptoId() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

/* ------------------------------------------------------------- categories */

function CategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useAppState();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍽️");

  return (
    <Sheet open={open} onClose={onClose} title="Kategori menu" subtitle="Dipakai untuk mengelompokkan tombol di layar kasir" size="lg"
      footer={
        <div className="flex gap-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori baru" className="h-12 flex-1" />
          <Button
            size="lg"
            onClick={() => {
              if (name.trim().length < 2) return;
              void saveCategory({ name: name.trim(), emoji, sort_order: app.categories.length });
              setName("");
            }}
          >
            Tambah
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {["🍽️", "🌶️", "🥤", "🍗", "🍚", "🍢", "☕", "🥟", "🍜", "🔥"].map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className={cx("press grid h-10 w-10 place-items-center rounded-xl border text-[20px]", emoji === e ? "border-turmeric bg-turmeric/15" : "border-line/70 bg-surface")}>
            {e}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {app.categories.length === 0 && <p className="text-[13px] font-semibold text-muted">Belum ada kategori.</p>}
        {app.categories.map((c, i) => (
          <Card key={c.id} className="flex items-center gap-2 p-2.5">
            <span className="text-[20px]">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-extrabold">{c.name}</p>
              <p className="text-[11.5px] font-semibold text-muted">{app.products.filter((p) => p.category_id === c.id).length} menu · urut {i + 1}</p>
            </div>
            <IconButton label={`Ubah nama ${c.name}`} onClick={() => { setName(c.name); setEmoji(c.emoji); void saveCategory({ id: c.id, name: c.name, emoji: c.emoji, sort_order: Math.max(0, i - 1) }); }}>
              <IconEdit size={16} />
            </IconButton>
            <IconButton
              label={`Hapus ${c.name}`}
              onClick={() =>
                askConfirm({
                  title: `Hapus kategori ${c.name}?`,
                  desc: "Menu di dalamnya tidak ikut terhapus — hanya menjadi “tanpa kategori”.",
                  okLabel: "Hapus kategori",
                  tone: "danger",
                  onOk: () => void deleteCategory(c.id),
                })
              }
            >
              <IconTrash size={16} />
            </IconButton>
          </Card>
        ))}
      </div>
    </Sheet>
  );
}
