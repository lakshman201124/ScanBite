import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScanBite — Restaurant OS",
  description: "Scan. Order. Enjoy. Multi-tenant restaurant management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${instrumentSerif.variable} h-full`}>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-plus-jakarta, var(--sans))" }}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
