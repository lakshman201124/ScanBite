import React from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SettingsForm from './SettingsForm';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.restaurantId) {
    redirect('/login');
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId }
  });

  if (!restaurant) {
    redirect('/login');
  }

  return (
    <main className="adm-main">
      <header className="adm-top">
        <div>
          <h1 style={{
            fontFamily: "var(--display)",
            fontSize: 28, fontWeight: 400,
            letterSpacing: "-0.02em", margin: 0, lineHeight: 1.1,
          }}>
            {restaurant.name || "Settings"}
            <em style={{ fontStyle: "italic", color: "var(--brand)", marginLeft: 8 }}>config</em>
          </h1>
          <div className="adm-top__sub" style={{ marginTop: 4 }}>
            Brand · Staff · Taxes · Hardware · Plans
          </div>
        </div>
        <div className="adm-top__spacer" />
        {/* Plan badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "7px 14px",
          background: "var(--ink)",
          borderRadius: 999,
          font: "700 11px var(--sans)",
          color: "#fff",
          letterSpacing: ".04em",
          textTransform: "uppercase",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {restaurant.plan?.toUpperCase() ?? "FREE"}
        </div>
      </header>

      <div className="adm-body">
        <SettingsForm restaurant={JSON.parse(JSON.stringify(restaurant))} />
      </div>
    </main>
  );
}
