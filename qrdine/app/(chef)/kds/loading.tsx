import { ScanBiteLoader } from "@/components/ui/ScanBiteLoader";

export default function KDSLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",   /* zinc-950 — matches chef layout */
        display: "grid",
        placeItems: "center",
      }}
    >
      <ScanBiteLoader dark label="Loading kitchen display…" />
    </div>
  );
}
