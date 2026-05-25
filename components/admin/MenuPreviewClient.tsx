"use client";

import { Monitor, RefreshCw, Smartphone, Tablet, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CustomerMenuClient } from "@/components/customer/CustomerMenuClient";

interface Props {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  restaurantLogo: string | null;
}

const VIEWPORTS = [
  { label: "Phone", width: 390, icon: Smartphone },
  { label: "Tablet", width: 768, icon: Tablet },
  { label: "Desktop", width: 960, icon: Monitor },
];

const PREVIEW_TABLE_ID = "00000000-0000-4000-8000-000000000001";

export function MenuPreviewClient({
  restaurantId,
  restaurantSlug,
  restaurantName,
  restaurantLogo,
}: Props) {
  const [viewport, setViewport] = useState(390);
  const [refreshKey, setRefreshKey] = useState(0);
  const menuUrl = `/m/${restaurantSlug}`;

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-5">
      <header className="rounded-[28px] border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[var(--sh-1)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--brand-deep)]">
              Customer preview
            </p>
            <h1 className="mt-1 text-[22px] font-black tracking-normal text-[var(--ink)]">Menu Preview</h1>
            <p className="mt-1 truncate text-[12px] font-semibold text-[var(--muted)]">
              {restaurantName} <span className="font-mono">{menuUrl}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-[var(--hairline)] bg-[var(--bg)] p-1">
              {VIEWPORTS.map(({ label, width, icon: Icon }) => {
                const active = viewport === width;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setViewport(width)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-black"
                    style={{
                      background: active ? "var(--surface)" : "transparent",
                      color: active ? "var(--ink)" : "var(--muted)",
                      boxShadow: active ? "var(--sh-1)" : "none",
                    }}
                  >
                    <Icon size={14} strokeWidth={2.4} />
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-[12px] font-black text-[var(--ink-2)]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            <Link
              href={menuUrl}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-[12px] font-black text-[var(--surface)] no-underline shadow-[var(--sh-coral)]"
            >
              <ExternalLink size={14} />
              Open live
            </Link>

            <Link
              href="/dashboard/menu"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-[12px] font-black text-[var(--ink-2)] no-underline"
            >
              <ArrowLeft size={14} />
              Editor
            </Link>
          </div>
        </div>
      </header>

      <section className="flex flex-1 justify-center overflow-auto rounded-[32px] border border-[var(--hairline)] bg-[radial-gradient(circle_at_top_left,rgba(255,77,61,.13),transparent_32%),var(--surface-2)] p-4 shadow-inner sm:p-6">
        <div className="relative">
          <div
            className="overflow-hidden bg-[var(--ink)] shadow-[var(--sh-3)]"
            style={{
              width: viewport + 24,
              borderRadius: viewport > 480 ? 32 : 30,
              padding: 12,
            }}
          >
            <div className="mb-2 flex h-8 items-center justify-between rounded-t-[18px] bg-[rgba(255,252,248,.07)] px-4">
              <span className="font-mono text-[11px] font-black text-[rgba(255,252,248,.7)]">9:41</span>
              <div className="flex gap-1">
                <span className="block h-2 w-4 rounded-sm bg-[rgba(255,252,248,.55)]" />
                <span className="block h-2 w-3 rounded-sm bg-[rgba(255,252,248,.35)]" />
              </div>
            </div>
            <div
              key={refreshKey}
              className="overflow-y-auto bg-[var(--bg)]"
              style={{
                width: viewport,
                height: 760,
                borderRadius: viewport > 480 ? 20 : 18,
              }}
            >
              <CustomerMenuClient
                restaurantId={restaurantId}
                restaurantName={restaurantName}
                restaurantSlug={restaurantSlug}
                restaurantLogo={restaurantLogo}
                tableNumber="Preview"
                tableId={PREVIEW_TABLE_ID}
              />
            </div>
          </div>
          <p className="mt-3 text-center font-mono text-[11px] font-bold text-[var(--muted)]">{viewport}px viewport</p>
        </div>
      </section>
    </div>
  );
}

