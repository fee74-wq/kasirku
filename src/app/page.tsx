"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleOnline = () => {
      window.dispatchEvent(new Event("app-online"));
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base text-ink">
        <div className="text-sm font-semibold animate-pulse">Memuat KasirKu...</div>
      </div>
    );
  }

  return <Shell />;
}
