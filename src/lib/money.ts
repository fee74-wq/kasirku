/**
 * Money helpers — INTEGER RUPIAH ONLY.
 * Nothing in this file ever touches float arithmetic: prices are whole rupiah,
 * totals are int*int sums, and percentage discounts go through one explicit
 * Math.round at the boundary. This is what keeps cash/change exact.
 */

export const RP = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

export function formatRp(value: number, opts: { sign?: boolean } = {}): string {
  const n = Math.round(value || 0);
  const s = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(n));
  if (n < 0) return `-Rp${s}`;
  return `${opts.sign ? "+" : ""}Rp${s}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

/** Keypad input: a string of digits becomes rupiah (right-to-left entry). */
export function digitsToRp(digits: string): number {
  const clean = digits.replace(/[^0-9]/g, "").slice(0, 10);
  if (!clean) return 0;
  return Number.parseInt(clean, 10) || 0;
}

export function rpToDigits(value: number): string {
  return String(Math.max(0, Math.round(value || 0)));
}

/** Percent discount applied to an integer subtotal. */
export function discountFromPercent(total: number, percent: number): number {
  const p = Math.min(100, Math.max(0, Math.round(percent || 0)));
  if (p === 0) return 0;
  return Math.round((RP(total) * p) / 100);
}

/** Nearest note upward — used by the "uang pas / pembulatan" quick keys. */
export function roundUpToNote(value: number, note: number): number {
  if (note <= 0) return value;
  return Math.ceil(value / note) * note;
}

export const CASH_NOTES = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500];

export function suggestNotes(total: number): number[] {
  const out = new Set<number>();
  for (const note of CASH_NOTES) {
    if (note >= total) {
      out.add(note);
      break;
    }
  }
  for (const n of [total, roundUpToNote(total, 500), roundUpToNote(total, 1000), roundUpToNote(total, 2000), roundUpToNote(total, 5000)]) {
    if (n >= total) out.add(n);
  }
  return [...out].sort((a, b) => a - b).slice(0, 6);
}
