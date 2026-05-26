"use client";

import { useState } from "react";
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { LowStockAlert } from '@/components/inventory/LowStockAlert';

export default function InventoryPage() {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <main className="adm-main">
      <header className="adm-top">
        <div>
          <h1 style={{
            fontFamily: "var(--display)",
            fontSize: 28, fontWeight: 400,
            letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1,
          }}>
            Inventory
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>& pricing</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            Prices · Stock levels · Low stock alerts
          </div>
        </div>
        <div className="adm-top__spacer" />
        {/* Helper hint */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 14px",
          background: "var(--amber-soft)",
          border: "1px solid rgba(242,165,0,.25)",
          borderRadius: 999,
          font: "600 11px var(--sans)",
          color: "#8a5b00",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Click any row to edit price
        </div>
      </header>

      <div className="adm-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <LowStockAlert onHighlight={setHighlightId} />
        <InventoryTable highlightId={highlightId} />
      </div>
    </main>
  );
}
