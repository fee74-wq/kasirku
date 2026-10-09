"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClose, IconCloudCheck, IconCloudOff, IconSync } from "@/components/icons";
import { useAppState } from "@/lib/store";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ button -- */

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  full?: boolean;
  icon?: ReactNode;
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const BUTTON_VARIANTS: Record<string, string> = {
  primary: "bg-chili text-white shadow-[0_10px_28px_-12px_rgba(255,90,54,0.9)] active:bg-chili-deep",
  secondary: "bg-elevated text-ink border border-line active:bg-raised",
  ghost: "bg-transparent text-muted active:bg-raised",
  outline: "bg-transparent text-ink border border-line/80 active:bg-raised",
  danger: "bg-[#5b1c14] text-[#ffd9cf] border border-[#8e2f22] active:bg-[#6c231a]",
  success: "bg-pandan text-[#08260f] active:brightness-95",
};

const BUTTON_SIZES: Record<string, string> = {
  sm: "h-9 px-3 text-[13px] rounded-xl gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-5 text-[17px] rounded-2xl gap-2",
  xl: "h-16 px-6 text-[19px] rounded-[20px] gap-2.5",
};

export function Button({ children, variant = "primary", size = "md", full, icon, loading, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "press inline-flex select-none items-center justify-center font-bold tracking-tight disabled:pointer-events-none disabled:opacity-45",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        full && "w-full",
        className,
      )}
    >
      {loading ? <span className="ticker h-4 w-4 rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ children, label, className, ...rest }: { children: ReactNode; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={cx(
        "press grid h-10 w-10 place-items-center rounded-xl border border-line/70 bg-raised/70 text-ink active:scale-95 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- chip -- */

export function Chip({
  children,
  active,
  className,
  ...rest
}: { children: ReactNode; active?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx(
        "press shrink-0 whitespace-nowrap rounded-pill border px-3.5 py-2 text-[13.5px] font-bold",
        active ? "border-transparent bg-turmeric text-[#2b1c02]" : "border-line/80 bg-raised/60 text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- input -- */

export function Field({
  label,
  hint,
  children,
  required,
  className,
}: { label: string; hint?: ReactNode; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-bold uppercase tracking-wide text-muted">
          {label}
          {required && <span className="text-chili"> *</span>}
        </span>
        {hint && <span className="text-[11.5px] font-medium text-muted/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-2xl border border-line/80 bg-surface/80 px-4 text-[16px] font-semibold text-ink placeholder:font-medium placeholder:text-muted/50 transition focus:border-turmeric/70 focus:bg-raised";

export function TextInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(inputBase, "h-13 py-3.5", className)} />;
}

export function MoneyInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} inputMode="numeric" pattern="[0-9]*" className={cx(inputBase, "tabular py-3.5", className)} />;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("press relative h-8 w-14 shrink-0 rounded-pill border transition-colors", checked ? "border-transparent bg-pandan" : "border-line bg-elevated")}
    >
      <span
        className={cx(
          "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-ink shadow transition-all duration-200",
          checked ? "left-[30px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-line/80 bg-raised p-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Kurangi"
        className="press grid h-9 w-9 place-items-center rounded-full bg-elevated text-ink active:scale-90 disabled:opacity-40"
        disabled={value <= min}
      >
        <span className="text-xl leading-none">−</span>
      </button>
      <span className="tabular min-w-8 text-center text-[17px] font-bold">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Tambah"
        className="press grid h-9 w-9 place-items-center rounded-full bg-chili text-white active:scale-90 disabled:opacity-40"
        disabled={value >= max}
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl border border-line/70 bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx("press flex-1 rounded-xl px-2 py-2 text-[13.5px] font-bold", value === o.value ? "bg-turmeric text-[#2b1c02]" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- sheet -- */

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "full";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  // Portal to <body>: sheets must escape <main>'s stacking context so the
  // footer action (Tambah / Bayar / Selesaikan) always sits above the bottom nav.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button aria-label="Tutup" onClick={onClose} className="fade-in absolute inset-0 bg-[#0b0703]/78 backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "sheet-in relative mx-auto flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-[26px] border border-b-0 border-line/70 bg-surface shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)]",
          size === "full" ? "max-h-[93dvh]" : size === "lg" ? "max-h-[88dvh]" : "max-h-[76dvh]",
        )}
      >
        <div className="flex items-start gap-3 border-b border-line/60 px-4 pb-3 pt-3">
          <div className="min-w-0 flex-1">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-line" />
            <h2 className="truncate text-[19px] leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] font-medium text-muted">{subtitle}</p>}
          </div>
          <IconButton label="Tutup" onClick={onClose} className="-mr-1 mt-4 h-9 w-9">
            <IconClose size={20} />
          </IconButton>
        </div>
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && <div className="safe-bottom shrink-0 border-t border-line/60 bg-surface/95 px-4 pb-3 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------- feedback -- */

export function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="reveal flex flex-col items-center gap-2 rounded-card border border-dashed border-line/80 bg-surface/50 px-5 py-9 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line/70 bg-raised text-turmeric">{icon}</span>
      <h3 className="text-[17px]">{title}</h3>
      {desc && <p className="max-w-[34ch] text-[13px] leading-relaxed font-medium text-muted">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SyncBadge() {
  const { syncing, online, lastSyncAt, syncError } = useAppState();
  const pending = useAppState().transactions.filter((t) => t.synced === 0).length;
  const label = !online
    ? "Offline"
    : syncing
      ? "Sinkron…"
      : pending > 0
        ? `${pending} menunggu`
        : syncError
          ? "Belum sinkron"
          : "Tersimpan";
  const tone = !online || syncError ? "text-turmeric" : pending > 0 ? "text-turmeric" : "text-pandan";
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-pill border border-line/70 bg-raised/70 px-2.5 py-1 text-[11.5px] font-bold", tone)}>
      {!online ? <IconCloudOff size={14} /> : syncing ? <IconSync size={14} className="animate-spin" /> : <IconCloudCheck size={14} />}
      {label}
      {lastSyncAt && !syncing && pending === 0 && online && (
        <span className="tabular text-[10.5px] text-muted/70">{new Date(lastSyncAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
      )}
    </span>
  );
}

export function ToastHost() {
  const { toast } = useAppState();
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[95] flex justify-center px-4">
      <div
        className={cx(
          "pop-in flex max-w-[92vw] items-center gap-2 rounded-pill border px-4 py-2.5 text-[13.5px] font-bold shadow-2xl backdrop-blur",
          toast.kind === "err" ? "border-[#8e2f22] bg-[#3b1109]/95 text-[#ffd9cf]" : "border-pandan/40 bg-[#0d2a19]/95 text-[#c9f5dc]",
        )}
      >
        {toast.kind === "err" ? null : <IconCheck size={16} />}
        <span className="truncate">{toast.msg}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ layout -- */

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("reveal relative z-10 mx-auto w-full max-w-[560px] px-4", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between gap-3">
      <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grain rounded-card border border-line/70 bg-surface/85", className)}>{children}</div>;
}

export function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const cls = cx("flex items-center gap-3 px-4 py-3.5 text-left", onClick && "press active:bg-raised/60", className);
  return onClick ? (
    <button onClick={onClick} className={cx(cls, "w-full")}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}
