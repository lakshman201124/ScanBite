"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { overlayVariants, sheetVariants } from "@/lib/animations";
import { cartItemCount, cartSubtotal, useCartStore } from "@/store/cart";
import { PhoneOtpSheet } from "@/components/customer/PhoneOtpSheet";

interface Props {
  onClose: () => void;
  restaurantSlug: string;
}

function formatPrice(value: number) {
  return `₹${value.toFixed(0)}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function CartDrawer({ onClose, restaurantSlug }: Props) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = cartSubtotal(items);
  const itemCount = cartItemCount(items);

  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [showOtpSheet, setShowOtpSheet] = useState(false);
  const [chefNote, setChefNote] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const couponDiscount = couponApplied ? Math.round(subtotal * 0.2) : 0;
  const discountedSubtotal = subtotal - couponDiscount;
  const cgst = discountedSubtotal * 0.025;
  const sgst = discountedSubtotal * 0.025;
  const total = discountedSubtotal + cgst + sgst;

  useEffect(() => {
    setCustomerName(getCookie("customer_name"));
    setCustomerPhone(getCookie("customer_phone"));
    const saved = sessionStorage.getItem("order_note");
    if (saved) setChefNote(saved);
  }, []);

  function handlePlaceOrder() {
    if (chefNote.trim()) sessionStorage.setItem("order_note", chefNote.trim());
    if (customerName) {
      router.push(`/m/${restaurantSlug}/checkout`);
      onClose();
    } else {
      setShowOtpSheet(true);
    }
  }

  function handleOtpSuccess() {
    setCustomerName(getCookie("customer_name"));
    setCustomerPhone(getCookie("customer_phone"));
    setShowOtpSheet(false);
    router.push(`/m/${restaurantSlug}/checkout`);
    onClose();
  }

  function handleSwitchCustomer() {
    setCustomerName(null);
    setCustomerPhone(null);
  }

  return (
    <>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[rgba(20,19,26,.45)]"
      />

      <motion.aside
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        aria-label="Cart"
        className="fixed bottom-0 left-1/2 z-[51] flex max-h-[92vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[28px] bg-[var(--bg)] shadow-[0_-24px_70px_-30px_rgba(20,19,26,.45)]"
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-[color-mix(in_oklab,var(--ink)_14%,transparent)]" />
        </div>

        {/* Header */}
        <div className="cart-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 40, height: 40, borderRadius: "var(--r-2)", background: "var(--surface-2)", border: 0, display: "grid", placeItems: "center", color: "var(--muted)", cursor: "pointer" }}
              aria-label="Close cart"
            >
              <X size={17} strokeWidth={2.5} />
            </button>
            <div>
              <h1>Your bag</h1>
              <div style={{ font: "500 12px var(--sans)", color: "var(--muted)" }}>
                {itemCount} item{itemCount !== 1 ? "s" : ""} · Table ready
              </div>
            </div>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => items.forEach((i) => removeItem(i.id))}
              style={{ width: 38, height: 38, borderRadius: 999, background: "rgba(224,58,48,.08)", border: 0, display: "grid", placeItems: "center", color: "var(--red)", cursor: "pointer" }}
              aria-label="Clear cart"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 8 }}>
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--muted)] shadow-[var(--sh-1)]">
                <ShoppingBag size={24} />
              </div>
              <p className="mt-4 text-sm font-black">Your bag is empty</p>
              <button type="button" onClick={onClose} className="mt-4 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-black text-[var(--surface)]">
                Add dishes
              </button>
            </div>
          ) : (
            <>
              {/* Cart items */}
              {items.map((item) => {
                const customExtra = item.customizations.reduce((sum, c) => sum + c.priceDelta, 0);
                const lineTotal = (item.price + customExtra) * item.quantity;
                return (
                  <motion.div layout key={item.id} className="cart-item">
                    {item.image_url ? (
                      <div className="cart-item__img" style={{ backgroundImage: `url(${item.image_url})` }} />
                    ) : (
                      <div className="cart-item__img" style={{ display: "grid", placeItems: "center", color: "var(--muted-2)" }}>
                        <ShoppingBag size={22} />
                      </div>
                    )}
                    <div className="cart-item__body">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                        <p className="cart-item__name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {item.name}
                        </p>
                        <button type="button" onClick={() => removeItem(item.id)} style={{ color: "var(--muted)", background: "none", border: 0, cursor: "pointer", flexShrink: 0, padding: 2 }} aria-label={`Remove ${item.name}`}>
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                      {item.customizations.length > 0 && (
                        <p className="cart-item__meta">{item.customizations.map((c) => c.optionLabel).join(", ")}</p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                        <div className="cart-item__price">{formatPrice(lineTotal)}</div>
                        <div className="cart-item__qty">
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease"><Minus size={12} strokeWidth={2.8} /></button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: "var(--ink)", color: "#fff" }} aria-label="Increase"><Plus size={12} strokeWidth={2.8} /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Coupon row */}
              <div
                className="coupon"
                onClick={() => setCouponApplied((v) => !v)}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setCouponApplied((v) => !v)}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: couponApplied ? "var(--green)" : "var(--brand)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, transition: "background .2s" }}>
                  <Tag size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="coupon__b">{couponApplied ? "FOODIE20 applied" : "Add coupon / promo code"}</div>
                  <div className="coupon__s" style={{ color: couponApplied ? "var(--green)" : undefined }}>
                    {couponApplied ? `20% off — saved ${formatPrice(couponDiscount)}` : "Apply a code to save on your order"}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={couponApplied ? "var(--green)" : "var(--brand)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>

              {/* Note for the chef */}
              <div style={{ margin: "0 20px 14px" }}>
                <div style={{ background: "var(--surface)", border: `1px solid ${chefNote ? "var(--brand)" : "var(--hairline)"}`, borderRadius: "var(--r-3)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start", transition: "border-color .15s" }}>
                  <FileText size={15} style={{ color: "var(--muted)", flexShrink: 0, marginTop: 1 }} />
                  <textarea
                    value={chefNote}
                    onChange={(e) => setChefNote(e.target.value)}
                    placeholder="Anything for the chef? Allergies, spice level, no onions…"
                    rows={2}
                    style={{ flex: 1, border: 0, outline: 0, background: "transparent", font: "500 13px var(--sans)", color: "var(--ink)", resize: "none", lineHeight: 1.5 }}
                  />
                </div>
              </div>

              {/* Bill breakdown */}
              <div className="bill-card">
                <div className="bill-row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                {couponApplied && (
                  <div className="bill-row muted">
                    <span>Discount (FOODIE20)</span>
                    <span style={{ color: "var(--green)" }}>−{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="bill-row muted"><span>CGST 2.5%</span><span>{formatPrice(cgst)}</span></div>
                <div className="bill-row muted"><span>SGST 2.5%</span><span>{formatPrice(sgst)}</span></div>
                <div className="bill-row total"><span>Total</span><b>{formatPrice(total)}</b></div>
              </div>

              {/* Returning customer banner */}
              {customerName && customerPhone && (
                <div style={{ margin: "0 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--r-2)", background: "var(--surface)", border: "1px solid var(--hairline)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: 0 }}>
                    Ordering as <span style={{ fontWeight: 800, color: "var(--ink)" }}>{customerName}</span>
                  </p>
                  <button type="button" onClick={handleSwitchCustomer} style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "none", border: 0, cursor: "pointer" }}>
                    Not you?
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* CTA footer */}
        <div style={{ padding: "14px 20px 28px", borderTop: "1px solid var(--hairline)" }}>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={items.length === 0}
            className="cta full"
            style={{ height: 56, fontSize: 15, fontWeight: 800, opacity: items.length === 0 ? 0.45 : 1, cursor: items.length === 0 ? "not-allowed" : "pointer" }}
          >
            Place order · Pay at counter
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {showOtpSheet && (
          <PhoneOtpSheet
            onSuccess={handleOtpSuccess}
            onClose={() => setShowOtpSheet(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
