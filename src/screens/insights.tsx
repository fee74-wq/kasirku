"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, EmptyState, Field, IconButton, MoneyInput, Sheet, TextInput, Toggle, cx, Segmented, SectionTitle } from "@/components/ui";
import { IconBowl, IconCheck, IconCloudCheck, IconCoins, IconDownload, IconHistory, IconLogout, IconPrint, IconSearch, IconSettings, IconShare, IconShield, IconSync, IconBolt, IconUser, IconCamera } from "@/components/icons";
import { askConfirm } from "@/components/confirm";
import { bootstrap, clearAllCache, exportBackup, saveBusinessProfile, signOut, syncNow, setTxnNote, useAppState } from "@/lib/store";
import { digitsToRp, formatRp, formatNumber } from "@/lib/money";
import { BUSINESS_TEMPLATES, getTemplate, type BusinessTypeKey } from "@/lib/menu-templates";
import { printReceipt, shareReceipt, txnDateTime } from "@/lib/receipt";
import { fileToDataUrl } from "@/lib/image";
import { toast } from "@/lib/store";
import type { Txn } from "@/lib/types";

type Range = "today" | "7d" | "30d" | "all";

function rangeStart(range: Range): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (range === "today") return midnight;
  if (range === "7d") return midnight - 6 * 86_400_000;
  if (range === "30d") return midnight - 29 * 86_400_000;
  return 0;
}

/* ============================================================ TRANSACTIONS */

export function RiwayatScreen() {
  const app = useAppState();
  const [range, setRange] = useState<Range>("today");
  const [custom, setCustom] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Txn | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = custom ? new Date(`${custom}T00:00:00`).getTime() : rangeStart(range);
    const to = custom ? from + 86_400_000 : Infinity;
    return app.transactions
      .filter((t) => {
        const time = new Date(t.created_at).getTime();
        return time >= from && time < to;
      })
      .filter((t) => (q ? t.items.some((i) => i.product_name.toLowerCase().includes(q)) || (t.note ?? "").toLowerCase().includes(q) || t.id.slice(0, 8).toLowerCase().includes(q) : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [app.transactions, range, custom, query]);

  const sum = rows.reduce((n, t) => n + t.total, 0);
  const pending = rows.filter((t) => t.synced === 0).length;

  const days = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of rows) {
      const key = txnDateTime(t.created_at).dayKey;
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <div className="pb-4">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-muted">Riwayat transaksi</p>
      <h1 className="text-[26px] leading-tight">Semua penjualan</h1>
      <p className="mt-1 text-[13px] font-semibold text-muted">Buku besar bersifat append-only — transaksi lama tidak pernah ditimpa.</p>

      <div className="relative mt-4">
        <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama menu, catatan, atau ID struk" className="h-11 py-0 pl-10 text-[15px]" inputMode="search" aria-label="Cari transaksi" />
      </div>

      <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
        {([["today", "Hari ini"], ["7d", "7 hari"], ["30d", "30 hari"], ["all", "Semua"]] as [Range, string][]).map(([k, label]) => (
          <Chip key={k} active={!custom && range === k} onClick={() => { setRange(k); setCustom(""); }}>
            {label}
          </Chip>
        ))}
        <label className="press flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-line/80 bg-raised px-3 text-[13px] font-bold text-muted">
          📅
          <input type="date" value={custom} onChange={(e) => setCustom(e.target.value)} className="tabular bg-transparent text-[13px] font-bold text-ink outline-none" aria-label="Pilih tanggal" />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-line/70 bg-gradient-to-br from-elevated to-surface px-4 py-3">
        <div>
          <p className="text-[11.5px] font-black uppercase tracking-wider text-muted">{custom ? new Date(`${custom}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : "Omzet"}</p>
          <p className="tabular text-[26px] font-extrabold leading-tight">{formatRp(sum)}</p>
        </div>
        <div className="text-right">
          <p className="text-[12.5px] font-bold text-muted">{rows.length} transaksi</p>
          <p className={cx("text-[12px] font-bold", pending > 0 ? "text-turmeric" : "text-pandan")}>{pending > 0 ? `${pending} belum sync` : "semua tersinkron"}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<IconHistory size={24} />} title="Belum ada transaksi" desc="Pesanan pertama yang kamu bayar di layar kasir akan muncul di sini, lengkap dengan struknya." />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {days.map(([day, list]) => {
            const info = txnDateTime(list[0].created_at);
            return (
              <section key={day}>
                <h2 className="mb-2 flex items-baseline gap-2 text-[12.5px] uppercase tracking-[0.12em] text-muted">
                  <span className="font-black text-ink">{info.weekday}</span>
                  {info.date}
                  <span className="tabular ml-auto text-[12px] font-extrabold normal-case tracking-normal text-turmeric">{formatRp(list.reduce((n, t) => n + t.total, 0))}</span>
                </h2>
                <div className="space-y-2">
                  {list.map((t, i) => (
                    <button key={t.id} onClick={() => setDetail(t)} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="reveal press flex w-full items-center gap-3 rounded-card border border-line/60 bg-surface/85 p-3 text-left active:bg-raised/60">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-elevated text-[12px] font-black">
                        <span className="tabular text-ink">{txnDateTime(t.created_at).time}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-extrabold">
                          {t.items.length === 1 ? `${t.items[0].qty}× ${t.items[0].product_name}` : `${t.item_count} item · ${t.items[0].product_name} +${t.items.length - 1}`}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-muted">
                          <span className="rounded-pill bg-raised px-1.5 py-0.5 uppercase">{t.payment_method}</span>
                          #{t.id.slice(0, 6).toUpperCase()}
                          {t.synced === 0 && <span className="inline-flex items-center gap-1 text-turmeric"><IconSync size={11} /> lokal</span>}
                          {t.note && <span className="truncate text-turmeric">· {t.note}</span>}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[15.5px] font-extrabold">{formatRp(t.total)}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TxnDetail txn={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function TxnDetail({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const app = useAppState();
  const [note, setNote] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    setNote(txn?.note ?? "");
    setHint(null);
  }, [txn?.id]);
  if (!txn) return null;
  const info = txnDateTime(txn.created_at);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Struk #${txn.id.slice(0, 6).toUpperCase()}`}
      subtitle={`${info.weekday}, ${info.date} · ${info.time}`}
      size="full"
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" size="lg" icon={<IconPrint size={17} />} onClick={() => { if (!printReceipt(txn, app.business)) setHint("Jendela cetak tidak terbuka — izinkan popup di browser."); }}>
            Cetak
          </Button>
          <Button size="lg" full icon={<IconShare size={17} />} onClick={() => void shareReceipt(txn, app.business).then((r) => setHint(r === "shared" ? "Struk dibagikan." : r === "copied" ? "Struk disalin — tinggal tempel ke WA pelanggan." : "Tidak bisa membagikan struk."))}>
            Bagikan struk
          </Button>
        </div>
      }
    >
      <div className="rounded-card border border-line/70 bg-surface p-4">
        <div className="flex items-center gap-3 border-b border-line/60 pb-3">
          {app.business?.logo ? (
            <img src={app.business.logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-elevated text-[20px]">{getTemplate(app.business?.business_type).categories[0]?.emoji ?? "🍽️"}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15.5px] font-extrabold">{app.business?.business_name}</p>
            {app.business?.address && <p className="truncate text-[11.5px] font-semibold text-muted">{app.business.address}</p>}
          </div>
          <span className={cx("ml-auto shrink-0 rounded-pill px-2 py-1 text-[10.5px] font-black uppercase", txn.synced === 0 ? "bg-turmeric/20 text-[#8a610c]" : "bg-pandan/18 text-pandan")}>{txn.synced === 0 ? "lokal" : "sync"}</span>
        </div>

        <div className="space-y-2 py-3">
          {txn.items.map((i, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 text-[14px]">
              <span className="min-w-0">
                <span className="font-extrabold">{i.qty}×</span> {i.product_name}
                {i.variant_label && <span className="block text-[11.5px] font-semibold text-muted">{i.variant_label}</span>}
                {i.note && <span className="block text-[11.5px] font-semibold text-turmeric">* {i.note}</span>}
              </span>
              <span className="tabular shrink-0 font-bold">{formatRp(i.line_total)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t border-line/60 pt-3 text-[13.5px] font-semibold">
          <Line label="Subtotal" value={formatRp(txn.subtotal)} />
          {txn.discount > 0 && <Line label="Diskon" value={`−${formatRp(txn.discount)}`} tone="turmeric" />}
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-[15px] font-extrabold">Total</span>
            <span className="tabular text-[22px] font-extrabold">{formatRp(txn.total)}</span>
          </div>
          <Line label={`Bayar (${txn.payment_method})`} value={formatRp(txn.cash_received)} />
          {txn.payment_method === "tunai" && <Line label="Kembalian" value={formatRp(txn.change_due)} tone="pandan" />}
        </div>
      </div>

      <Card className="mt-3 p-3.5">
        <p className="text-[12.5px] font-bold uppercase tracking-wide text-muted">Catatan kasir</p>
        <div className="mt-2 flex gap-2">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (txn.note ?? "")) void setTxnNote(txn.id, note).then(() => toast("Catatan disimpan.", "ok")); }} placeholder="mis. pesanan dibungkus, bayar besok" className="h-11 flex-1 text-[14px]" />
        </div>
        {hint && <p className="mt-2 text-[12.5px] font-bold text-turmeric">{hint}</p>}
      </Card>

      <p className="mt-3 flex items-start gap-2 text-[11.5px] font-semibold leading-relaxed text-muted">
        <IconShield size={15} className="mt-0.5 shrink-0 text-pandan" />
        Nilai transaksi (device {txn.device_id}, {txn.cashier_name ?? "kasir"}) tidak bisa diubah atau dihapus supaya riwayat aman saat sinkronisasi penuh nanti. Hanya catatan yang bisa diperbarui.
      </p>
    </Sheet>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "turmeric" | "pandan" }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted">{label}</span>
      <span className={cx("tabular font-bold", tone === "turmeric" ? "text-turmeric" : tone === "pandan" ? "text-pandan" : "text-ink")}>{value}</span>
    </div>
  );
}

/* ==================================================================== REPORTS */

export function LaporanScreen() {
  const app = useAppState();
  const [range, setRange] = useState<Range>("today");

  const { list, prev, bucket } = useMemo(() => {
    const from = rangeStart(range);
    const midnight = rangeStart("today");
    const span = range === "today" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : range === "30d" ? 30 * 86_400_000 : Math.max(86_400_000, Date.now() - from);
    const inRange = app.transactions.filter((t) => new Date(t.created_at).getTime() >= from);
    const prevRange = app.transactions.filter((t) => {
      const time = new Date(t.created_at).getTime();
      return time >= from - span && time < from;
    });

    // Chart window: always 7 readable bars — daily for today/7d, grouped for 30d/all.
    const bars = 7;
    const chartSpan = range === "today" || range === "7d" ? 7 * 86_400_000 : range === "30d" ? 30 * 86_400_000 : Math.max(7 * 86_400_000, Date.now() - midnight);
    const size = Math.max(3_600_000, Math.round(chartSpan / bars));
    const buckets: [string, number][] = [];
    for (let i = bars - 1; i >= 0; i--) {
      const start = midnight + 86_400_000 - (i + 1) * size;
      const end = start + size;
      const total = app.transactions
        .filter((t) => {
          const time = new Date(t.created_at).getTime();
          return time >= start && time < end;
        })
        .reduce((n, t) => n + t.total, 0);
      const label = size > 86_400_000 ? new Date(start).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : new Date(start).toLocaleDateString("id-ID", { weekday: "short" }).slice(0, 3);
      buckets.push([label, total]);
    }
    return { list: inRange, prev: prevRange, bucket: buckets };
  }, [app.transactions, range]);

  const total = list.reduce((n, t) => n + t.total, 0);
  const prevTotal = prev.reduce((n, t) => n + t.total, 0);
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const items = list.reduce((n, t) => n + t.item_count, 0);
  const avg = list.length > 0 ? Math.round(total / list.length) : 0;
  const max = Math.max(1, ...bucket.map(([, v]) => v));

  const best = useMemo(() => {
    const map = new Map<string, { name: string; glyph: string | null; qty: number; revenue: number }>();
    for (const t of list)
      for (const i of t.items) {
        const cur = map.get(i.product_id) ?? { name: i.product_name, glyph: i.glyph, qty: 0, revenue: 0 };
        map.set(i.product_id, { ...cur, qty: cur.qty + i.qty, revenue: cur.revenue + i.line_total });
      }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [list]);

  const hours = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of list) {
      const h = new Date(t.created_at).getHours();
      map.set(h, (map.get(h) ?? 0) + 1);
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return { peak: entries[0]?.[0] ?? null, entries: entries.slice(0, 3) };
  }, [list]);

  const methods = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of list) map.set(t.payment_method, (map.get(t.payment_method) ?? 0) + t.total);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);

  return (
    <div className="pb-4">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-muted">Laporan</p>
      <h1 className="text-[26px] leading-tight">Omzet & menu favorit</h1>

      <div className="mt-3">
        <Segmented value={range} onChange={setRange} options={[{ value: "today", label: "Hari ini" }, { value: "7d", label: "7 hari" }, { value: "30d", label: "30 hari" }, { value: "all", label: "Semua" }]} />
      </div>

      <Card className="mt-3 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-chili to-[#a72c16] p-4 text-white">
          <p className="text-[11.5px] font-black uppercase tracking-[0.16em] text-white/80">Omzet {range === "today" ? "hari ini" : range === "all" ? "total" : range === "7d" ? "7 hari" : "30 hari"}</p>
          <p className="tabular mt-1 text-[40px] font-extrabold leading-none">{formatRp(total)}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] font-bold">
            {delta !== null && (
              <span className={cx("rounded-pill px-2 py-1", delta >= 0 ? "bg-white/20" : "bg-[#0d0a07]/30")}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs periode sebelumnya
              </span>
            )}
            <span className="rounded-pill bg-white/15 px-2 py-1">{list.length} transaksi</span>
            <span className="rounded-pill bg-white/15 px-2 py-1">{formatNumber(items)} item</span>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line/60 border-t border-line/60">
          <div className="p-3.5">
            <p className="text-[11.5px] font-black uppercase tracking-wider text-muted">Rata-rata / struk</p>
            <p className="tabular mt-0.5 text-[19px] font-extrabold">{formatRp(avg)}</p>
          </div>
          <div className="p-3.5">
            <p className="text-[11.5px] font-black uppercase tracking-wider text-muted">Jam ramai</p>
            <p className="tabular mt-0.5 text-[19px] font-extrabold">{hours.peak !== null ? `${String(hours.peak).padStart(2, "0")}.00 – ${String((hours.peak + 1) % 24).padStart(2, "0")}.00` : "belum ada"}</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Grafik omzet</SectionTitle>
      <Card className="p-3.5">
        <div className="flex h-32 items-end gap-1.5">
          {bucket.map(([label, value], i) => (
            <div key={label + i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="tabular text-[9.5px] font-bold text-muted">{value > 0 ? `${Math.round(value / 1000)}rb` : ""}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-chili-deep to-chili transition-[height] duration-500"
                style={{ height: `${Math.max(2, Math.round((value / max) * 92))}%`, animationDelay: `${i * 40}ms` }}
              />
              <span className="truncate text-[9.5px] font-bold text-muted">{label}</span>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>Menu paling laris</SectionTitle>
      {best.length === 0 ? (
        <EmptyState icon={<IconBowl size={24} />} title="Belum ada data" desc="Laporan dihitung langsung dari transaksi yang tersimpan di HP ini — termasuk saat offline." />
      ) : (
        <Card className="divide-y divide-line/50 p-0">
          {best.map((b, i) => (
            <div key={b.name + i} className="flex items-center gap-3 px-3.5 py-3">
              <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-elevated text-[12px] font-black text-turmeric">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-extrabold">{b.glyph} {b.name}</span>
                  <span className="tabular shrink-0 text-[13px] font-bold text-muted">{b.qty} porsi</span>
                </span>
                <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-pill bg-raised">
                  <span className="block h-full rounded-pill bg-gradient-to-r from-turmeric to-chili transition-all duration-700" style={{ width: `${Math.round((b.qty / best[0].qty) * 100)}%` }} />
                </span>
              </span>
              <span className="tabular w-[74px] shrink-0 text-right text-[13.5px] font-extrabold">{formatNumber(Math.round(b.revenue / 1000))}rb</span>
            </div>
          ))}
        </Card>
      )}

      {methods.length > 0 && (
        <>
          <SectionTitle>Metode pembayaran</SectionTitle>
          <Card className="p-3.5">
            <div className="flex flex-wrap gap-2">
              {methods.map(([m, v]) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-pill border border-line/70 bg-raised px-3 py-1.5 text-[12.5px] font-bold">
                  <IconCoins size={14} className="text-turmeric" /> {m.toUpperCase()} <span className="tabular text-muted">{formatRp(v)}</span>
                </span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ================================================================= SETTINGS */

export function PengaturanScreen() {
  const app = useAppState();
  const b = app.business;
  const [form, setForm] = useState({
    business_name: b?.business_name ?? "",
    address: b?.address ?? "",
    phone: b?.phone ?? "",
    receipt_footer: b?.receipt_footer ?? "",
    logo: b?.logo ?? null as string | null,
    business_type: (b?.business_type ?? "lainnya") as BusinessTypeKey,
  });
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sub, setSub] = useState(false);
  const [installEvent, setInstallEvent] = useState<(Event & { prompt: () => void; userChoice: { then: (cb: (r: { outcome: string }) => void) => void } }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as never);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function save() {
    setBusy(true);
    try {
      await saveBusinessProfile({
        business_name: form.business_name,
        address: form.address,
        phone: form.phone,
        receipt_footer: form.receipt_footer,
        logo: form.logo,
        business_type: form.business_type,
      });
      setDirty(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Server belum terjangkau — simpan lagi nanti.", "err");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    try {
      const blob = new Blob([exportBackup()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kasirku-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast("Cadangan JSON diunduh.", "ok");
    } catch {
      toast("Unduhan tidak didukung browser ini.", "err");
    }
  }

  const tier = b?.subscription_tier ?? "free";
  const pending = app.transactions.filter((t) => t.synced === 0).length;

  return (
    <div className="pb-4">
      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-muted">Pengaturan</p>
      <h1 className="text-[26px] leading-tight">Profil usaha & aplikasi</h1>

      <Card className="mt-4 p-4">
        <div className="flex items-center gap-3.5">
          <button ref={undefined} onClick={() => fileRef.current?.click()} className="press grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line text-[11px] font-bold text-muted" style={form.logo ? { backgroundImage: `url(${form.logo})`, backgroundSize: "cover" } : { background: "linear-gradient(150deg,#322313,#1d140a)" }} aria-label="Ganti logo usaha">
            {!form.logo && <IconCamera size={20} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; void fileToDataUrl(f, 240, 0.7).then((url) => { setForm((s) => ({ ...s, logo: url })); setDirty(true); }); }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-extrabold">{form.business_name || "Usaha Baru"}</p>
            <p className="mt-0.5 text-[12px] font-bold text-muted">
              Workspace #{b?.id.slice(0, 8) ?? "-"} · tier {tier}
            </p>
            <button onClick={() => { void navigator.clipboard?.writeText(b?.id ?? ""); toast("ID tenant disalin.", "info"); }} className="press mt-1 text-[11.5px] font-black uppercase tracking-wide text-turmeric">
              salin ID tenant
            </button>
          </div>
        </div>
        <div className="mt-3.5 space-y-2.5">
          <Field label="Nama usaha" required>
            <TextInput value={form.business_name} onChange={(e) => { setForm((s) => ({ ...s, business_name: e.target.value })); setDirty(true); }} maxLength={60} />
          </Field>
          <Field label="Alamat" hint="tercetak di struk">
            <TextInput value={form.address} onChange={(e) => { setForm((s) => ({ ...s, address: e.target.value })); setDirty(true); }} maxLength={200} />
          </Field>
          <Field label="No. HP / WhatsApp">
            <TextInput value={form.phone} onChange={(e) => { setForm((s) => ({ ...s, phone: e.target.value.replace(/[^0-9+ -]/g, "") })); setDirty(true); }} inputMode="tel" />
          </Field>
          <Field label="Catatan di bawah struk">
            <TextInput value={form.receipt_footer} onChange={(e) => { setForm((s) => ({ ...s, receipt_footer: e.target.value })); setDirty(true); }} placeholder="Makasih sudah mampir!" maxLength={140} />
          </Field>
          <Field label="Jenis usaha" hint="menentukan template menu">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(BUSINESS_TEMPLATES) as BusinessTypeKey[]).map((k) => (
                <Chip key={k} active={form.business_type === k} onClick={() => { setForm((s) => ({ ...s, business_type: k })); setDirty(true); }}>
                  {BUSINESS_TEMPLATES[k].label.split(" (")[0].split(" /")[0]}
                </Chip>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-3.5 flex gap-2.5">
          <Button full size="lg" loading={busy} disabled={!dirty} onClick={() => void save()}>
            {dirty ? "Simpan perubahan" : "Tersimpan ✓"}
          </Button>
          <IconButton label="Muat template menu" className="h-14 w-14 shrink-0" onClick={() => askConfirm({ title: "Muat template menu?", desc: `Item bawaan ${BUSINESS_TEMPLATES[form.business_type].label} yang belum ada akan ditambahkan.`, okLabel: "Muat", onOk: () => void import("@/lib/store").then((m) => m.applyTemplateLocally(form.business_type, { replace: false })) })}>
            <IconBolt size={20} />
          </IconButton>
        </div>
      </Card>

      <SectionTitle>Langganan</SectionTitle>
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tier === "free" ? "bg-raised text-muted" : "bg-turmeric/18 text-turmeric")}>
            <IconShield size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-extrabold">{tier === "free" ? "Paket Gratis" : tier === "umkm" ? "Paket UMKM" : "Paket Pro"}</p>
            <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-muted">
              {tier === "free" ? "Kasir, menu, riwayat, laporan harian — lengkap & tanpa batas transaksi." : "Fitur berbayar aktif (menu multi-device, ekspor, laporan WA)."}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="md" full className="mt-3" onClick={() => setSub(true)}>
          Lihat paket & upgrade
        </Button>
      </Card>

      <SectionTitle>Data offline & sinkronisasi</SectionTitle>
      <Card className="divide-y divide-line/50 p-0">
        <Rowish icon={<IconCloudCheck size={19} />} title="Sinkron ke server" desc={pending > 0 ? `${pending} transaksi & perubahan menu masih di HP` : `Semua data aman • ${app.lastSyncAt ? new Date(app.lastSyncAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "belum pernah"}`}>
          <Button size="sm" variant="secondary" loading={app.syncing} icon={<IconSync size={15} />} onClick={() => void syncNow({ silent: false })}>
            Sinkronkan
          </Button>
        </Rowish>
        <Rowish icon={<IconDownload size={19} />} title="Unduh cadangan JSON" desc="Kirim file ini ke Google Drive / WA sebagai backup manual." action={undefined}>
          <Button size="sm" variant="secondary" onClick={download}>
            Unduh
          </Button>
        </Rowish>
        <Rowish icon={<IconSettings size={19} />} title="Kosongkan cache perangkat" desc="Hapus salinan lokal di HP ini. Data di server tetap ada dan akan diunduh lagi saat online.">
          <Button size="sm" variant="danger" onClick={() => askConfirm({ title: "Hapus cache lokal?", desc: "Pastikan semua transaksi sudah tersinkron. Riwayat di HP akan dikosongkan lalu ditarik ulang dari server.", okLabel: "Hapus cache", tone: "danger", onOk: () => void clearAllCache().then(() => bootstrap()) })}>
            Hapus
          </Button>
        </Rowish>
      </Card>

      <SectionTitle>Aplikasi</SectionTitle>
      <Card className="divide-y divide-line/50 p-0">
        <Rowish icon={<IconBolt size={19} />} title="Pasang di HP (PWA)" desc="Tombol muncul di menu browser bila belum dipasang.">
          {installEvent ? (
            <Button size="sm" onClick={() => { installEvent.prompt(); setInstallEvent(null); }}>
              Pasang
            </Button>
          ) : (
            <span className="rounded-pill bg-raised px-2.5 py-1 text-[11.5px] font-bold text-pandan">siap dipasang</span>
          )}
        </Rowish>
        <Rowish icon={<IconUser size={19} />} title={app.user?.name ?? "Kasir"} desc={`${app.user?.email ?? "-"} · peran ${app.user?.role ?? "owner"}`}>
          <span className="rounded-pill bg-pandan/18 px-2.5 py-1 text-[11.5px] font-black uppercase text-pandan">{app.user?.role ?? "owner"}</span>
        </Rowish>
        <Rowish icon={<IconLogout size={19} />} title="Keluar akun" desc="Cache lokal dibersihkan agar usaha berikutnya tidak melihat datamu.">
          <Button size="sm" variant="danger" onClick={() => askConfirm({ title: "Keluar dari KasirKu?", desc: pending > 0 ? `${pending} transaksi belum tersinkron. Kalau keluar sekarang, data tetap ada di server tapi salinan HP dihapus.` : "Kamu bisa login lagi kapan saja dengan email & password yang sama.", okLabel: "Keluar", tone: "danger", onOk: () => void signOut() })}>
            Keluar
          </Button>
        </Rowish>
      </Card>

      <p className="mt-5 text-center text-[11.5px] font-semibold leading-relaxed text-muted/80">
        KasirKu v0.9 (MVP) · dibuat untuk usaha kuliner Indonesia
        <br />
        Data tiap usaha dipisah otomatis lewat tenant ID — tidak ada campur antar toko.
      </p>

      <Sheet open={sub} onClose={() => setSub(false)} title="Paket langganan" subtitle="Pembayaran akan dihubungkan ke gateway di tahap berikutnya" size="lg">
        <div className="space-y-2.5">
          {([
            { key: "free", name: "Gratis", price: 0, perks: ["Kasir & menu tanpa batas", "1 perangkat", "Riwayat + laporan harian", "Offline penuh"] },
            { key: "umkm", name: "UMKM", price: 29000, perks: ["Semua fitur Gratis", "Multi-device 1 usaha", "Laporan mingguan & bulanan", "Kirim laporan ke WhatsApp"] },
            { key: "pro", name: "Pro", price: 59000, perks: ["Semua fitur UMKM", "Cetak struk Bluetooth", "Pajak & diskon bertingkat", "Dukungan prioritas"] },
          ] as const).map((p) => (
            <Card key={p.key} className={cx("p-4", tier === p.key && "border-turmeric/70")}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[16.5px] font-extrabold">Paket {p.name}</p>
                <p className="tabular text-[15px] font-extrabold text-turmeric">{p.price === 0 ? "Rp0" : `${formatRp(p.price)}/bln`}</p>
              </div>
              <ul className="mt-2 space-y-1">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-[12.5px] font-semibold text-muted">
                    <IconCheck size={14} className="mt-0.5 shrink-0 text-pandan" /> {perk}
                  </li>
                ))}
              </ul>
              <Button
                size="md"
                full
                className="mt-3"
                variant={tier === p.key ? "secondary" : "primary"}
                disabled={tier === p.key}
                onClick={() =>
                  askConfirm({
                    title: `Upgrade ke ${p.name}?`,
                    desc: `Gateway pembayaran (Midtrans/Xendit) belum dipasang. Tim kami akan mengirim link bayar ke ${app.user?.email ?? "email kamu"} begitu aktif.`,
                    okLabel: "Daftarkan minat",
                    onOk: () => toast("Minat upgrade dicatat. Link bayar menyusul 🙌", "info"),
                  })
                }
              >
                {tier === p.key ? "Paket aktif" : "Upgrade"}
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11.5px] font-semibold leading-relaxed text-muted">
          <IconBowl size={15} className="mt-0.5 shrink-0 text-turmeric" />
          Paket Gratis tidak membatasi jumlah transaksi — kamu boleh pakai selamanya untuk jualan harian.
        </p>
      </Sheet>
    </div>
  );
}

function Rowish({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc?: string; action?: unknown; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-turmeric">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-extrabold">{title}</span>
        {desc && <span className="block text-[11.5px] font-semibold leading-snug text-muted">{desc}</span>}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

export const RangeHelper = { rangeStart, digitsToRp, formatNumber };
