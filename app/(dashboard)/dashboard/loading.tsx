import { ScanBiteLoader } from "@/components/ui/ScanBiteLoader";

export default function DashboardLoading() {
  return (
    <main className="adm-main" style={{ flex: 1, display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <ScanBiteLoader label="Loading dashboard…" />
    </main>
  );
}
