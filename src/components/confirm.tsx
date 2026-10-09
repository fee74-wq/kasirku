"use client";

/**
 * App-native confirmation + prompt system.
 *
 * Replaces window.confirm()/window.prompt() everywhere: dialogs are rendered by
 * <ConfirmHost/> inside the app shell, and call sites stay a single
 * synchronous line — `askConfirm({ ... onOk })`.
 */

import { useEffect, useReducer, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, cx } from "@/components/ui";
import { IconClose } from "@/components/icons";

export type ConfirmConfig = {
  title: string;
  desc?: ReactNode;
  okLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onOk: () => void;
};

let current: ConfirmConfig | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function askConfirm(config: ConfirmConfig) {
  current = config;
  emit();
}

export function closeConfirm() {
  if (!current) return;
  current = null;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function ConfirmHost() {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribe(force), []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm();
      if (e.key === "Enter") {
        const ok = current?.onOk;
        closeConfirm();
        ok?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!current) return null;
  const cfg = current;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-0">
      <button aria-label="Tutup dialog" onClick={closeConfirm} className="fade-in absolute inset-0 bg-[#0d0a07]/70 backdrop-blur-[3px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={cfg.title}
        className="pop-in relative w-full max-w-[420px] overflow-hidden rounded-[22px] border border-line/70 bg-surface p-5 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.6)]"
      >
        <button onClick={closeConfirm} className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-muted active:bg-raised" aria-label="Batal">
          <IconClose size={18} />
        </button>
        <h3 className={cx("pr-8 text-[20px] leading-tight", cfg.tone === "danger" && "text-[#d6402c]")}>{cfg.title}</h3>
        {cfg.desc && <div className="mt-2 text-[13.5px] font-medium leading-relaxed text-muted">{cfg.desc}</div>}
        <div className="mt-5 flex gap-2.5">
          <Button variant="secondary" size="lg" full onClick={closeConfirm}>
            {cfg.cancelLabel ?? "Batal"}
          </Button>
          <Button
            variant={cfg.tone === "danger" ? "danger" : "primary"}
            size="lg"
            full
            onClick={() => {
              const ok = cfg.onOk;
              closeConfirm();
              ok();
            }}
          >
            {cfg.okLabel ?? "Ya, lanjut"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
