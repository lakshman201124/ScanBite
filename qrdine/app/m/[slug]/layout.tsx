export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-scope" style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)" }}>
      {children}
    </div>
  );
}
