import { ScanBiteLoader } from "@/components/ui/ScanBiteLoader";

export default function OnboardingLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <ScanBiteLoader label="Setting up your restaurant…" />
    </div>
  );
}
