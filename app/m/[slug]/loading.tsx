import { ScanBiteLoader } from "@/components/ui/ScanBiteLoader";

export default function CustomerMenuLoading() {
  return (
    <div
      className="mob"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <ScanBiteLoader label="Loading menu…" />
    </div>
  );
}
