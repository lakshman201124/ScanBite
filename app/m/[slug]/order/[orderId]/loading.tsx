import { ScanBiteLoader } from "@/components/ui/ScanBiteLoader";

export default function OrderTrackingLoading() {
  return (
    <div
      className="mob tracking"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <ScanBiteLoader label="Loading order…" />
    </div>
  );
}
