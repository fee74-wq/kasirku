"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { fileToDataUrl } from "@/lib/image";
import { BUSINESS_TEMPLATES, BUSINESS_TYPE_ORDER, flattenTemplate, type BusinessTypeKey } from "@/lib/menu-templates";
import { applyTemplateLocally, completeOnboarding, saveBusinessProfile, syncNow, useAppState } from "@/lib/store";
import { vibrate } from "@/lib/device";
import { Button, Card, Chip, Field, Sheet, TextInput, cx } from "@/components/ui";
import {
  IconBoba,
  IconBowl,
  IconCheck,
  IconChili,
  IconFire,
  IconGrid,
  IconLock,
  IconMail,
  IconRice,
  IconSearch,
  IconShield,
  IconSkewer,
  IconUser,
  IconBolt,
  IconGoogle,
  IconChevron,
} from "@/components/icons";

type Step = "splash" | "type" | "auth" | "profile";
type AuthResult = { user?: Record<string, unknown>; business?: Record<string, unknown>; needs_profile?: boolean };

const TYPE_ICON: Record<BusinessTypeKey, React.ReactNode> = {
  seblak: <IconChili size={30} />,
  minuman: <IconBoba size={30} />,
  ayam: <IconFire size={30} />,
  sate: <IconSkewer size={30} />,
  warung: <IconRice size={30} />,
  lainnya: <IconGrid size={30} />,
};

export function Onboarding({ onReady }: { onReady: () => void }) {
  const [step, setStep] = useState<Step>("splash");
  const [type, setType] = useState<BusinessTypeKey | null>(null);
  const [session, setSession] = useState<AuthResult | null>(null);
  const app = useAppState();

  useEffect(() => {
    if (step !== "splash") return;
    const t = setTimeout(() => setStep("type"), 2100);
    return () => clearTimeout(t);
  }, [step]);

  async function adopt(result: AuthResult, seedIfEmpty: boolean) {
    const businessType = (result.business as { businessType?: BusinessTypeKey } | undefined)?.businessType ?? type ?? "lainnya";
    await completeOnboarding(result, businessType, seedIfEmpty);
    if ((result.needs_profile ?? true) && seedIfEmpty) {
      setSession(result);
      setStep("profile");
    } else {
      onReady();
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-base">
      {step === "splash" && <Splash onSkip={() => setStep("type")} />}
      {step === "type" && (
        <TypePicker
          selected={type}
          onSelect={(t) => {
            setType(t);
            vibrate(14);
            setTimeout(() => setStep("auth"), 180);
          }}
        />
      )}
      {step === "auth" && (
        <AuthScreen
          type={type ?? "lainnya"}
          onBack={() => setStep("type")}
          onAuthed={(res, seed) => void adopt(res, seed)}
        />
      )}
      {step === "profile" && (
        <ProfileSetup
          type={type ?? "lainnya"}
          onDone={() => {
            void adoptAfterProfile(type ?? "lainnya", app, onReady);
            setTimeout(onReady, 60);
          }}
        />
      )}
    </div>
  );
}

/** profile step saves the business then seeds the chosen starter menu */
async function adoptAfterProfile(type: BusinessTypeKey, _app: unknown, onReady: () => void) {
  void type;
  onReady();
}

/* ------------------------------------------------------------------ splash -- */

function Splash({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-hidden px-6 pb-8 pt-[env(safe-area-inset-top)]">
      <div className="absolute inset-0 -z-0">
        <img src="/img/warung.jpg" alt="" className="ken h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-base/70 via-base/55 to-base" />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <div className="pop-in relative mb-6 grid h-24 w-24 place-items-center rounded-[26px] border border-turmeric/30 bg-gradient-to-br from-chili to-chili-deep shadow-[0_22px_60px_-18px_rgba(255,90,54,0.65)]">
          <IconBowl size={46} className="text-ink" />
          <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-turmeric text-[#2b1c02] text-[15px] font-black">₹</span>
        </div>
        <h1 className="display text-[52px] leading-[0.92] text-ink">
          Kasir<span className="text-chili">Ku</span>
        </h1>
        <p className="mt-3 max-w-[26ch] text-[15px] font-semibold text-muted">
          Kasir cepat buat seblak, boba, ayam, sate, dan warung. Tetap jalan meski sinyal hilang.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[12px] font-bold text-ink/80">
          {["Offline dulu, sync kemudian", "Hitung kembalian otomatis", "1 app banyak usaha"].map((t) => (
            <span key={t} className="rounded-pill border border-line/70 bg-raised/70 px-3 py-1.5">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="relative z-10">
        <button onClick={onSkip} className="press mb-4 flex w-full items-center justify-between rounded-2xl border border-line/70 bg-surface/70 px-4 py-3 text-[13px] font-bold text-muted">
          <span className="flex items-center gap-2">
            <IconShield size={16} className="text-pandan" />
            Datamu terisolasi per usaha (multi-tenant)
          </span>
          <IconChevron size={16} />
        </button>
        <Button size="xl" full onClick={onSkip}>
          Mulai — gratis
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- type selection -- */

function TypePicker({ selected, onSelect }: { selected: BusinessTypeKey | null; onSelect: (t: BusinessTypeKey) => void }) {
  const counts = useMemo(() => {
    const map = {} as Record<string, number>;
    for (const key of BUSINESS_TYPE_ORDER) map[key] = flattenTemplate(key).length;
    return map;
  }, []);

  return (
    <div className="relative min-h-dvh px-5 pb-28 pt-[calc(env(safe-area-inset-top)+26px)]">
      <div className="reveal">
        <p className="text-[12.5px] font-black uppercase tracking-[0.18em] text-chili">Langkah 1 dari 3</p>
        <h1 className="mt-2 text-[34px] leading-[1.02] text-ink">
          Pilih jenis usaha
          <br />
          <span className="text-muted">kamu dulu</span>
        </h1>
        <p className="mt-2.5 text-[14px] font-medium leading-relaxed text-muted">
          Kami siapkan menu, varian, dan harga contoh yang biasa dipakai. Nanti bisa kamu ubah kapan saja.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        {BUSINESS_TYPE_ORDER.map((key, i) => {
          const tpl = BUSINESS_TEMPLATES[key];
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{ animationDelay: `${70 + i * 55}ms`, backgroundImage: `linear-gradient(115deg, ${tpl.accent[0]}2e, ${tpl.accent[1]}0d)` }}
              className={cx(
                "reveal press grain relative flex items-center gap-3.5 overflow-hidden rounded-card border p-3.5 text-left",
                active ? "border-turmeric bg-elevated" : "border-line/70 bg-surface/80",
              )}
            >
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] border border-white/10 text-ink"
                style={{ backgroundImage: `linear-gradient(150deg, ${tpl.accent[0]}, ${tpl.accent[1]})` }}
              >
                {TYPE_ICON[key]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-extrabold text-ink">{tpl.label}</span>
                <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-muted">{tpl.tagline}</span>
              </span>
              <span className="shrink-0 rounded-pill bg-base/60 px-2.5 py-1 text-[11px] font-black text-turmeric">{counts[key]} menu</span>
            </button>
          );
        })}
      </div>
      <p className="mt-6 text-center text-[12px] font-semibold text-muted/80">Salah pilih tidak apa-apa — jenis usaha bisa diganti di Pengaturan.</p>
    </div>
  );
}

/* -------------------------------------------------------------------- auth -- */

function AuthScreen({ type, onBack, onAuthed }: { type: BusinessTypeKey; onBack: () => void; onAuthed: (res: AuthResult, seedIfEmpty: boolean) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleInfo, setGoogleInfo] = useState(false);
  const tpl = BUSINESS_TEMPLATES[type];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<AuthResult & Record<string, unknown>>(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(
          mode === "register"
            ? { name, email, password, businessType: type, businessName: "" }
            : { email, password },
        ),
      });
      vibrate(18);
      onAuthed(res, mode === "register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function demo() {
    setBusy(true);
    setError(null);
    const creds = { email: `demo.${type}@kasirku.id`, password: "demo1234", name: "Admin Demo" };
    try {
      const res = await api<AuthResult>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...creds, businessType: type, businessName: `Demo ${tpl.label.split(" ")[0]}` }),
      });
      onAuthed(res, true);
    } catch {
      try {
        const res = await api<AuthResult>("/api/auth/login", { method: "POST", body: JSON.stringify(creds) });
        onAuthed(res, false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Demo gagal dimulai.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh px-5 pb-10 pt-[calc(env(safe-area-inset-top)+18px)]">
      <button onClick={onBack} className="press mb-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
        <IconChevron size={16} className="rotate-180" /> Ganti jenis usaha
      </button>

      <div className="reveal flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 text-ink" style={{ backgroundImage: `linear-gradient(150deg, ${tpl.accent[0]}, ${tpl.accent[1]})` }}>
          {TYPE_ICON[type]}
        </span>
        <div>
          <p className="text-[12px] font-black uppercase tracking-[0.16em] text-chili">Langkah 2 dari 3</p>
          <h1 className="text-[26px] leading-tight">{mode === "register" ? "Buat akun usahamu" : "Masuk lagi"}</h1>
        </div>
      </div>

      <div className="mt-5 flex gap-1.5 rounded-2xl border border-line/70 bg-surface p-1.5">
        {(["register", "login"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cx("press flex-1 rounded-xl py-2.5 text-[14px] font-extrabold", mode === m ? "bg-turmeric text-[#2b1c02]" : "text-muted")}
          >
            {m === "register" ? "Daftar usaha baru" : "Sudah punya akun"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "register" && (
          <Field label="Nama kamu" required hint="untuk login kasir">
            <div className="relative">
              <IconUser size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <TextInput required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Rina Wulandari" className="pl-11" autoComplete="name" />
            </div>
          </Field>
        )}
        <Field label="Email" required>
          <div className="relative">
            <IconMail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kasir@warung.id" className="pl-11" autoComplete="email" inputMode="email" />
          </div>
        </Field>
        <Field label="Password" required hint={mode === "register" ? "min. 6 karakter" : undefined}>
          <div className="relative">
            <IconLock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-11" autoComplete={mode === "register" ? "new-password" : "current-password"} />
          </div>
        </Field>

        {error && <p className="rounded-2xl border border-[#8e2f22] bg-[#3b1109]/80 px-3.5 py-2.5 text-[13px] font-bold text-[#ffd9cf]">{error}</p>}

        <Button type="submit" size="xl" full loading={busy}>
          {mode === "register" ? "Lanjut ke profil usaha" : "Masuk ke kasir"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-[12px] font-black uppercase tracking-widest text-muted/60">
        <span className="h-px flex-1 bg-line" /> atau <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleSignIn
        onCredential={async (credential) => {
          setBusy(true);
          try {
            const res = await api<AuthResult>("/api/auth/google", { method: "POST", body: JSON.stringify({ credential, businessType: type }) });
            onAuthed(res, Boolean(res.needs_profile));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google login gagal.");
          } finally {
            setBusy(false);
          }
        }}
        onUnavailable={() => setGoogleInfo(true)}
      />

      <Card className="mt-4 p-3.5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-turmeric/15 text-turmeric">
            <IconBolt size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-extrabold">Belum mau bikin akun? Lihat demo dulu</p>
            <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-muted">
              Workspace <b className="text-ink">Demo {tpl.label}</b> dibuat terpisah, lengkap dengan {flattenTemplate(type).length} menu & varian.
            </p>
            <Button variant="secondary" size="sm" className="mt-2.5" onClick={() => void demo()} disabled={busy}>
              Coba mode demo
            </Button>
          </div>
        </div>
      </Card>

      <Sheet open={googleInfo} onClose={() => setGoogleInfo(false)} title="Google Sign-In belum terhubung" subtitle="Satu klik aktif setelah Client ID diisi">
        <p className="text-[14px] font-medium leading-relaxed text-muted">
          Tombol Google sudah terpasang dan mengalir ke <b className="text-ink">/api/auth/google</b> (verifikasi token di server). Untuk mengaktifkannya,
          tambahkan variabel <code className="tabular rounded bg-raised px-1.5 py-0.5 text-[12.5px] text-turmeric">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> di
          environment — setelah itu akun lama via email otomatis terhubung dengan email Google yang sama.
        </p>
        <Button full className="mt-4" onClick={() => setGoogleInfo(false)}>
          Lanjut pakai email
        </Button>
      </Sheet>
    </div>
  );
}

function GoogleSignIn({ onCredential, onUnavailable }: { onCredential: (credential: string) => void; onUnavailable: () => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || !holder.current) return;
    const id = "gsi-script";
    const mount = () => {
      const g = (window as unknown as { google?: any }).google;
      if (!g?.accounts?.id) return;
      g.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => onCredential(r.credential) });
      g.accounts.id.renderButton(holder.current, { theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: 300 });
    };
    if (document.getElementById(id)) mount();
    else {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.id = id;
      s.onload = mount;
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (clientId) return <div ref={holder} className="flex justify-center" />;

  return (
    <button
      onClick={onUnavailable}
      className="press flex h-14 w-full items-center justify-center gap-2.5 rounded-[20px] border border-line/80 bg-ink px-5 text-[16px] font-extrabold text-[#1d140a]"
    >
      <IconGoogle size={20} className="text-[#1d140a]" />
      Lanjut dengan Google
    </button>
  );
}

/* --------------------------------------------------------- business profile */

const GLYPHS = ["🍜", "🥘", "🍛", "🍗", "🧋", "☕", "🍢", "🍚", "🥤", "🌶️", "🍤", "🥟"];

function ProfileSetup({ type, onDone }: { type: BusinessTypeKey; onDone: () => void }) {
  const app = useAppState();
  const tpl = BUSINESS_TEMPLATES[type];
  const items = useMemo(() => flattenTemplate(type), [type]);
  const [form, setForm] = useState({
    business_name: (app.business?.business_name ?? "") === "Usaha Baru" ? "" : app.business?.business_name ?? "",
    address: app.business?.address ?? "",
    phone: app.business?.phone ?? "",
    logo: app.business?.logo ?? null as string | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = (app.business?.business_name ?? "") !== "Usaha Baru";

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await saveBusinessProfile({
        business_name: form.business_name.trim() || "Usaha Baru",
        address: form.address.trim(),
        phone: form.phone.trim(),
        logo: form.logo,
        business_type: type,
      });
      if (app.products.length === 0) await applyTemplateLocally(type, { replace: false });
      else if (!seeded) await syncNow({ silent: true });
      vibrate([10, 40, 18]);
      onDone();
    } catch (err) {
      // offline during onboarding: keep going on the local snapshot, sync will retry later
      setError(err instanceof Error ? err.message : "Server belum terjangkau. Data disimpan di HP dulu.");
      if (app.products.length === 0) await applyTemplateLocally(type, { replace: false }).catch(() => undefined);
      setTimeout(onDone, 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh px-5 pb-32 pt-[calc(env(safe-area-inset-top)+18px)]">
      <p className="reveal text-[12px] font-black uppercase tracking-[0.16em] text-chili">Langkah 3 dari 3</p>
      <h1 className="reveal mt-2 text-[30px] leading-tight">Profil usaha {tpl.label.split(" ")[0].toLowerCase()}</h1>
      <p className="mt-1.5 text-[14px] font-medium text-muted">Ini yang tercetak di struk dan muncul di beranda aplikasi.</p>

      <div className="mt-5 space-y-3">
        <Card className="p-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="press relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line text-muted"
              style={form.logo ? { backgroundImage: `url(${form.logo})`, backgroundSize: "cover" } : { background: "linear-gradient(150deg,#271b0f,#1d140a)" }}
              aria-label="Upload logo"
            >
              {!form.logo && <span className="text-[11px] font-bold">Logo</span>}
            </button>
            <div className="min-w-0">
              <p className="text-[15.5px] font-extrabold">{form.business_name || "Usaha Baru"}</p>
              <p className="mt-0.5 line-clamp-2 text-[12.5px] font-medium text-muted">{form.address || "Belum ada alamat"}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] font-black text-turmeric">
                <IconCheck size={13} /> {tpl.label}
              </p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void fileToDataUrl(f, 240, 0.7)
                .then((url) => setForm((s) => ({ ...s, logo: url })))
                .catch(() => setError("Foto logo tidak bisa diproses."));
            }}
          />
        </Card>

        <Field label="Nama usaha" required>
          <TextInput value={form.business_name} onChange={(e) => setForm((s) => ({ ...s, business_name: e.target.value }))} placeholder="Seblak Bu Rina" maxLength={60} />
        </Field>
        <Field label="Alamat" hint="opsional">
          <TextInput value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} placeholder="Jl. Melati No. 12, Bandung" maxLength={200} />
        </Field>
        <Field label="No. HP / WA" hint="opsional">
          <TextInput value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value.replace(/[^0-9+ -]/g, "") }))} placeholder="0812xxxxxxx" inputMode="tel" />
        </Field>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] uppercase tracking-[0.14em] text-muted">Menu bawaan yang akan dimuat</h2>
          <span className="rounded-pill bg-raised px-2 py-1 text-[11px] font-black text-turmeric">{items.length} item</span>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {items.map((i, idx) => (
            <div key={i.name + idx} className="reveal w-[132px] shrink-0 rounded-2xl border border-line/70 bg-surface/80 p-3" style={{ animationDelay: `${idx * 35}ms` }}>
              <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl text-[22px]" style={{ backgroundImage: `linear-gradient(150deg, ${tpl.accent[0]}33, ${tpl.accent[1]}12)` }}>
                {i.glyph || GLYPHS[idx % GLYPHS.length]}
              </div>
              <p className="truncate text-[13px] font-extrabold">{i.name}</p>
              <p className="tabular mt-0.5 text-[12px] font-bold text-turmeric">Rp{i.basePrice.toLocaleString("id-ID")}</p>
              {i.groups.length > 0 && <p className="mt-1 truncate text-[11px] font-semibold text-muted">{i.groups.map((g) => g.name).join(" · ")}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-[12.5px] font-semibold text-muted">
          <IconSearch size={15} className="mt-0.5 shrink-0" />
          Varian seperti level pedas, ukuran, dan topping sudah otomatis dibuat. Semuanya bisa diedit di menu <b className="text-ink">Menu</b>.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[560px] border-t border-line/70 bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {error && <p className="mb-2 text-[12.5px] font-bold text-[#ffb9a8]">{error}</p>}
        <Button size="xl" full loading={busy} onClick={() => void finish()} icon={<IconCheck size={20} />}>
          Simpan & mulai jualan
        </Button>
      </div>
    </div>
  );
}

export const ONBOARDING_STEPS = ["splash", "type", "auth", "profile"] as const;
