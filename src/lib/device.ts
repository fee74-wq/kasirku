const KEY = "kasirku.device_id";

/** Stable per-install device id — transactions are attributed to it for multi-device sync. */
export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
  } catch {
    /* storage blocked (private mode) — fall through to an ephemeral id */
  }
  const id = `dev-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Budget WebView fallback (non-secure contexts still need unique ids).
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

export async function vibrate(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
