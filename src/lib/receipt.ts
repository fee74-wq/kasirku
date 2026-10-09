import type { Business, Txn } from "@/lib/types";
import { formatRp } from "@/lib/money";

export function txnDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    dayKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    weekday: d.toLocaleDateString("id-ID", { weekday: "long" }),
    raw: d,
  };
}

export function receiptText(txn: Txn, business: Business | null): string {
  const { date, time } = txnDateTime(txn.created_at);
  const lines = txn.items.map((i) => {
    const head = `${i.qty}x ${i.product_name}`;
    const opts = i.variant_label ? `\n   ${i.variant_label}` : "";
    const note = i.note ? `\n   * ${i.note}` : "";
    return `${head}${opts}${note}\n   ${formatRp(i.line_total)}`;
  });
  return [
    business?.business_name ?? "KasirKu",
    business?.address ? `${business.address}` : "",
    `────────────────────`,
    `${date} ${time} · #${txn.id.slice(0, 6).toUpperCase()}`,
    `Kasir: ${txn.cashier_name ?? "-"}`,
    `────────────────────`,
    ...lines,
    `────────────────────`,
    `Subtotal        ${formatRp(txn.subtotal)}`,
    txn.discount > 0 ? `Diskon         -${formatRp(txn.discount)}` : "",
    `TOTAL           ${formatRp(txn.total)}`,
    `Bayar (${txn.payment_method}) ${formatRp(txn.cash_received)}`,
    txn.change_due > 0 ? `Kembali         ${formatRp(txn.change_due)}` : "",
    `────────────────────`,
    business?.receipt_footer ?? "Makasih sudah mampir! 🙏",
    `\nDibuat dengan KasirKu`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Thermal-friendly print path: open a bare window so no app CSS is pulled in. */
export function printReceipt(txn: Txn, business: Business | null) {
  const html = receiptText(txn, business)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\n/g, "<br/>");
  const win = window.open("_blank", "kasirku-print", "width=380,height=640");
  if (!win) return false;
  win.document.write(
    `<html lang="id"><head><meta charset="utf-8"><title>Struk ${business?.business_name ?? ""}</title>` +
      `<style>body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-width:280px;padding:12px;color:#000;background:#fff}` +
      `h4{margin:0 0 6px;font-size:13px}@media print{@page{margin:6mm;size:80mm auto}}</style></head>` +
      `<body>${html}<script>setTimeout(function(){window.print()},250)</script></body></html>`,
  );
  win.document.close();
  return true;
}

export async function shareReceipt(txn: Txn, business: Business | null): Promise<"shared" | "copied" | "failed"> {
  const text = receiptText(txn, business);
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && (!nav.canShare || nav.canShare({ text }))) {
      await nav.share({ title: `Struk ${business?.business_name ?? "KasirKu"}`, text });
      return "shared";
    }
  } catch {
    /* user dismissed the share sheet */
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
