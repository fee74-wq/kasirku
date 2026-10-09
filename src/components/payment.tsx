"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Sheet, Segmented, cx } from "@/components/ui";
import { IconBackspace, IconCheck, IconCoins, IconPrint, IconShare, IconTag } from "@/components/icons";
import { cartTotals, checkout, linePrice, useAppState, type State } from "@/lib/store";
import { digitsToRp, formatRp, rpToDigits } from "@/lib/money";
import { vibrate } from "@/lib/device";
import { printReceipt, shareReceipt } from "@/lib/receipt";
import type { PaymentMethod, Txn } from "@/lib/types";

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "del"] as const;

export function PaymentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app: State = useAppState();
  const totals = cartTotals();
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [digits, setDigits] = useState("");
  const [done, setDone] = useState<Txn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(null);
    setError(null);
    setMethod("tunai");
    setDigits(totals.total > 0 ? rpToDigits(totals.total) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cash = method === "tunai" ? digitsToRp(digits) : totals.total;
  const change = Math.max(0, cash - totals.total);
  const short = Math.max(0, totals.total - cash);

  const quick = useMemo(() => {
    const set = new Set<number>([totals.total]);
    for (const note of [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]) {
      if (note >= totals.total) {
        set.add(note);
        break;
      }
      set.add(note);
    }
    const rounded = Math.ceil(totals.total / 500) * 500;
    if (rounded > totals.total) set.add(rounded);
    return [...set].filter((n) => n >= totals.total).sort((a, b) => a - b).slice(0, 5);
  }, [totals.total]);

  function press(key: (typeof KEYS)[number]) {
    setError(null);
    if (key === "del") {
      setDigits((d) => (d.length <= 1 ? "" : d.slice(0, -1)));
      return;
    }
    setDigits((d) => {
      if (d === "0") return key;
      const next = (d + key).replace(/^0+(?=\d)/, "");
      return next.slice(0, 9);
    });
    vibrate(8);
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const txn = await checkout({ cash, method });
      setDone(txn);
      vibrate([12, 40, 22]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belum bisa simpan.");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setDone(null);
    onClose();
  }

  if (done) return <SuccessSheet txn={done} onClose={handleClose} />;

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Bayar"
      subtitle={`${totals.count} item · ${app.business?.business_name ?? ""}`}
      size="full"
      footer={
        <div className="space-y-2.5">
          {error && <p className="text-center text-[13px] font-bold text-[#d6402c]">{error}</p>}
          <Button size="xl" full variant={short > 0 && method === "tunai" ? "secondary" : "primary"} loading={busy} onClick={() => void pay()}>
            {short > 0 && method === "tunai" ? `Kurang ${formatRp(short)}` : `Selesaikan · ${formatRp(totals.total)}`}
          </Button>
        </div>
      }
    >
      <div className="rounded-card border border-line/70 bg-gradient-to-br from-elevated to-surface p-4 text-center">
        <p className="text-[12px] font-black uppercase tracking-[0.16em] text-muted">Total bayar</p>
        <p className="tabular mt-1 text-[40px] font-extrabold leading-none">{formatRp(totals.total)}</p>
        {totals.discount > 0 && <p className="mt-1.5 text-[12.5px] font-bold text-turmeric">Diskon {formatRp(totals.discount)} diterapkan</p>}
      </div>

      <div className="mt-4">
        <Segmented
          value={method}
          onChange={setMethod}
          options={[
            { value: "tunai", label: "Tunai" },
            { value: "qris", label: "QRIS" },
            { value: "transfer", label: "Transfer" },
            { value: "lain", label: "Lain" },
          ]}
        />
      </div>

      {method === "tunai" ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11.5px] font-black uppercase tracking-wider text-muted">Uang diterima</p>
              <p className="tabular truncate text-[27px] font-extrabold leading-tight">{digits ? formatRp(cash) : "Rp0"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11.5px] font-black uppercase tracking-wider text-muted">Kembalian</p>
              <p className={cx("tabular text-[22px] font-extrabold leading-tight", short > 0 ? "text-[#d6402c]" : "text-pandan")}>
                {short > 0 ? `-${formatRp(short)}` : formatRp(change)}
              </p>
            </div>
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setDigits(rpToDigits(totals.total))} className="press flex h-11 shrink-0 items-center gap-1.5 rounded-pill border border-turmeric/50 bg-turmeric/15 px-3.5 text-[13.5px] font-extrabold text-[#8a610c]">
              <IconCoins size={16} /> Uang pas
            </button>
            {quick
              .filter((n) => n !== totals.total)
              .map((n) => (
                <button key={n} onClick={() => setDigits(rpToDigits(n))} className="press tabular h-11 shrink-0 rounded-pill border border-line/80 bg-raised px-3.5 text-[14px] font-bold active:bg-elevated">
                  {n.toLocaleString("id-ID")}
                </button>
              ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className={cx(
                  "press tabular grid h-15 place-items-center rounded-2xl border text-[24px] font-extrabold",
                  k === "del" ? "border-line/60 bg-surface text-muted active:bg-raised" : "border-line/70 bg-raised/80 active:bg-elevated",
                )}
                aria-label={k === "del" ? "Hapus satu digit" : `Angka ${k}`}
              >
                {k === "del" ? <IconBackspace size={24} /> : k}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-card border border-line/70 bg-surface p-4">
          <p className="text-[14px] font-bold">Pembayaran non-tunai</p>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-muted">
            {method === "qris"
              ? "Tunjukkan nominal ke pelanggan atau tempelkan sticker QRIS milikmu. Transaksi tetap dicatat sebagai lunas."
              : "Catat pembayaran transfer/manual. Nomor referensi bisa ditulis di catatan transaksi setelah disimpan."}
          </p>
          <p className="tabular mt-3 rounded-2xl bg-elevated px-4 py-3 text-center text-[26px] font-extrabold">{formatRp(totals.total)}</p>
        </div>
      )}

      <div className="mt-4 space-y-1.5">
        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-muted">Rincian</p>
        {app.cart.map((l) => {
          const unit = linePrice(l.base_price, l.options);
          return (
            <div key={l.line_id} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-1.5 text-[13.5px] font-semibold">
              <span className="min-w-0 truncate">
                <span className="tabular text-muted">{l.qty}×</span> {l.name}
                {l.options.length > 0 && <span className="block truncate text-[11.5px] text-muted">{l.options.map((o) => o.name).join(" · ")}</span>}
              </span>
              <span className="tabular shrink-0 font-extrabold">{formatRp(unit * l.qty)}</span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function SuccessSheet({ txn, onClose }: { txn: Txn; onClose: () => void }) {
  const app = useAppState();
  const [hint, setHint] = useState<string | null>(null);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Pembayaran berhasil"
      subtitle={txn.synced === 0 ? "Tersimpan di HP — otomatis dikirim ke server" : "Sudah tersimpan di server"}
      size="full"
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="lg"
            full
            icon={<IconShare size={18} />}
            onClick={() =>
              void shareReceipt(txn, app.business).then((r) => setHint(r === "shared" ? "Struk dibagikan." : r === "copied" ? "Struk disalin ke clipboard." : "Bagikan tidak tersedia di HP ini."))
            }
          >
            Bagikan
          </Button>
          <Button size="lg" full icon={<IconCheck size={18} />} onClick={onClose}>
            Transaksi baru
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="pop-in grid h-20 w-20 place-items-center rounded-full bg-pandan/18 text-pandan">
          <IconCheck size={44} strokeWidth={2.6} />
        </div>
        <p className="mt-3 text-[13.5px] font-bold text-muted">Uang diterima</p>
        <p className="tabular text-[24px] font-extrabold">{formatRp(txn.cash_received)}</p>
        {txn.payment_method === "tunai" ? (
          <>
            <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-turmeric px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-[#2b1c02]">
              <IconTag size={16} /> Kembalian
            </p>
            <p className="tabular text-[46px] font-extrabold leading-tight text-[#8a610c]">{formatRp(txn.change_due)}</p>
          </>
        ) : (
          <p className="mt-3 rounded-pill bg-raised px-4 py-2 text-[13px] font-bold text-muted">Bayar via {txn.payment_method.toUpperCase()} · lunas</p>
        )}
      </div>

      <div className="mt-4 rounded-card border border-line/70 bg-surface p-4">
        {txn.items.map((i, idx) => (
          <div key={idx} className="flex items-baseline justify-between gap-3 border-b border-line/40 py-2 last:border-0 text-[14px] font-semibold">
            <span className="min-w-0 truncate">
              <span className="tabular text-muted">{i.qty}×</span> {i.product_name}
              {i.variant_label && <span className="block truncate text-[11.5px] text-muted">{i.variant_label}</span>}
            </span>
            <span className="tabular shrink-0 font-extrabold">{formatRp(i.line_total)}</span>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between border-t border-line/70 pt-2.5 text-[15px] font-extrabold">
          <span>Total</span>
          <span className="tabular">{formatRp(txn.total)}</span>
        </div>
      </div>

      {hint && <p className="mt-3 text-center text-[12.5px] font-bold text-turmeric">{hint}</p>}

      <button onClick={() => printReceipt(txn, app.business)} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line/80 py-3 text-[13px] font-bold text-muted active:bg-raised">
        <IconPrint size={17} /> Cetak struk (Bluetooth / WiFi printer)
      </button>
      <p className="mt-2 text-center text-[11.5px] font-semibold text-muted/70">ID transaksi #{txn.id.slice(0, 8).toUpperCase()} · device {txn.device_id.slice(-4)}</p>
    </Sheet>
  );
}
