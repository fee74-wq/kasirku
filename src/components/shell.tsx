"use client";

import { useEffect, useState } from "react";
import { bootstrap, useAppState } from "@/lib/store";
import { Onboarding } from "@/components/onboarding";
import { KasirScreen } from "@/screens/kasir";
import { MenuScreen } from "@/screens/menu";
import { LaporanScreen, PengaturanScreen, RiwayatScreen } from "@/screens/insights";
import { ConfirmHost } from "@/components/confirm";
import { SyncBadge, ToastHost, cx } from "@/components/ui";
import { IconBowl, IconChart, IconHistory, IconKasir, IconSettings } from "@/components/icons";
import { getTemplate } from "@/lib/menu-templates";

type Tab = "kasir" | "menu" | "riwayat" | "laporan" | "pengaturan";
const TABS: { key: Tab; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
  { key: "kasir", label: "Kasir", icon: (p) => <IconKasir {...p} /> },
  { key: "menu", label: "Menu", icon: (p) => <IconBowl {...p} /> },
  { key: "riwayat", label: "Riwayat", icon: (p) => <IconHistory {...p} /> },
  { key: "laporan", label: "Laporan", icon: (p) => <IconChart {...p} /> },
  { key: "pengaturan", label: "Atur", icon: (p) => <IconSettings {...p} /> },
];

function readTab(): Tab {
  if (typeof window === "undefined") return "kasir";
  const param = new URLSearchParams(window.location.search).get("s");
  return (TABS.some((t) => t.key === param) ? (param as Tab) : "kasir");
}

export function Shell() {
  const app = useAppState();
  const [phase, setPhase] = useState<"init" | "onboarding" | "app">("init");
  const [tab, setTab] = useState<Tab>("kasir");

  useEffect(() => {
    void bootstrap();
    setTab(readTab());
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      });
    }
  }, []);

  const signedIn = Boolean(app.user && app.business);

  useEffect(() => {
    if (!app.ready) return;
    if (phase === "init") setPhase(signedIn ? "app" : "onboarding");
    else if (phase === "app" && !signedIn) setPhase("onboarding");
  }, [app.ready, signedIn, phase]);

  function go(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("s", next);
    window.history.replaceState({}, "", url.toString());
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  if (phase !== "app") {
    return (
      <>
        {phase === "init" ? <Booting /> : <Onboarding onReady={() => setPhase("app")} />}
        <ConfirmHost />
        <ToastHost />
      </>
    );
  }

  const accent = getTemplate(app.business?.business_type).accent;
  const pending = app.transactions.filter((t) => t.synced === 0).length;

  return (
    <div className="relative min-h-dvh pb-[calc(76px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 border-b border-line/50 bg-base/92 backdrop-blur-md">
        <div className="safe-top">
          <div className="mx-auto flex w-full max-w-[560px] items-center gap-2.5 px-4 py-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink" style={{ backgroundImage: `linear-gradient(150deg, ${accent[0]}, ${accent[1]})` }}>
              <IconBowl size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold leading-tight">{app.business?.business_name}</p>
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
                {getTemplate(app.business?.business_type).label}
                {app.business?.subscription_tier === "free" ? " · gratis" : ` · ${app.business?.subscription_tier}`}
              </p>
            </div>
            <SyncBadge />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[560px] px-4 pt-3">
        {tab === "kasir" && <KasirScreen />}
        {tab === "menu" && <MenuScreen />}
        {tab === "riwayat" && <RiwayatScreen />}
        {tab === "laporan" && <LaporanScreen />}
        {tab === "pengaturan" && <PengaturanScreen />}
      </main>

      {!app.online && (
        <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+58px)] z-20 mx-auto flex w-full max-w-[560px] justify-center px-4">
          <p className="fade-in rounded-pill border border-turmeric/40 bg-[#3a2a06]/90 px-3 py-1.5 text-[11.5px] font-bold text-turmeric">
            Mode offline — semua penjualan tetap masuk {pending > 0 ? `· ${pending} antre sync` : ""}
          </p>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[560px] border-t border-line/60 bg-surface/95 backdrop-blur-md">
        <div className="safe-bottom flex items-stretch justify-around px-1.5 pb-2 pt-1.5">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                aria-current={active ? "page" : undefined}
                className={cx("press relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5", active ? "text-ink" : "text-muted")}
              >
                <span className={cx("grid h-7 w-7 place-items-center transition-transform", active && "-translate-y-0.5 scale-110 text-chili")}>{t.icon({ size: 22 })}</span>
                <span className="text-[10.5px] font-black uppercase tracking-wide">{t.label}</span>
                {active && <span className="absolute -top-1.5 h-[3px] w-8 rounded-full bg-chili" />}
                {t.key === "riwayat" && pending > 0 && <span className="tabular absolute right-2 top-1 grid h-4 min-w-4 place-items-center rounded-pill bg-turmeric px-1 text-[9.5px] font-black text-[#2b1c02]">{pending}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <ConfirmHost />
      <ToastHost />
    </div>
  );
}

function Booting() {
  return (
    <div className="grid min-h-dvh place-items-center bg-base px-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="pop-in grid h-20 w-20 place-items-center rounded-[24px] bg-gradient-to-br from-chili to-chili-deep text-ink shadow-[0_20px_50px_-18px_rgba(255,90,54,0.7)]">
          <IconBowl size={40} />
        </span>
        <div>
          <p className="display text-[26px]">KasirKu</p>
          <p className="mt-1 text-[13px] font-semibold text-muted">Membuka data di perangkat kamu…</p>
        </div>
        <span className="shimmer h-1 w-40 rounded-full bg-raised" />
      </div>
    </div>
  );
}
