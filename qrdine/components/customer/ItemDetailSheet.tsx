"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, Clock3, FileText, Flame, Heart, Minus, Plus, Share2, ShoppingBag } from "lucide-react";

import { overlayVariants, sheetVariants } from "@/lib/animations";
import { useCartStore, type CartCustomization } from "@/store/cart";

interface Option {
  id: string;
  label: string;
  price_delta: number;
}

interface Customization {
  id: string;
  name: string;
  group_type: "single" | "multi" | "required" | string;
  is_required: boolean;
  options: Option[];
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: string;
  prep_time_minutes: number | null;
  customizations: Customization[];
}

interface Props {
  item: Item;
  onClose: () => void;
  onAdded: () => void;
}

const foodColors: Record<string, string> = {
  veg: "#0F8A1F",
  vegan: "#0F8A1F",
  non_veg: "#E23744",
  egg: "#FBBF24",
};

function formatPrice(value: number) {
  return `₹${value.toFixed(0)}`;
}

export function ItemDetailSheet({ item, onClose, onAdded }: Props) {
  const addItem = useCartStore((state) => state.addItem);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [note, setNote] = useState("");

  const toggleOption = (groupId: string, optionId: string, groupType: string) => {
    setSelected((previous) => {
      const current = previous[groupId] ?? [];

      if (groupType === "multi") {
        return {
          ...previous,
          [groupId]: current.includes(optionId)
            ? current.filter((currentOption) => currentOption !== optionId)
            : [...current, optionId],
        };
      }

      return { ...previous, [groupId]: [optionId] };
    });
  };

  const getCustomizationsForCart = (): CartCustomization[] => {
    const result: CartCustomization[] = [];

    item.customizations.forEach((group) => {
      const chosen = selected[group.id] ?? [];
      chosen.forEach((optionId) => {
        const option = group.options.find((groupOption) => groupOption.id === optionId);
        if (option) {
          result.push({ groupName: group.name, optionLabel: option.label, priceDelta: option.price_delta });
        }
      });
    });

    return result;
  };

  const customizations = getCustomizationsForCart();
  const extraPrice = customizations.reduce((sum, customization) => sum + customization.priceDelta, 0);
  const total = (Number(item.price) + extraPrice) * qty;
  const foodColor = foodColors[item.food_type] ?? foodColors.veg;

  const handleAdd = () => {
    const missing = item.customizations.filter((group) => group.is_required && !(selected[group.id]?.length));
    if (missing.length > 0) {
      setError(`Please select: ${missing.map((group) => group.name).join(", ")}`);
      return;
    }

    setError("");
    addItem(
      {
        menuItemId: item.id,
        name: item.name,
        price: Number(item.price),
        image_url: item.image_url,
        food_type: item.food_type,
        customizations,
      },
      qty,
    );
    onAdded();
  };

  return (
    <>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-[52] bg-[rgba(20,19,26,.52)]"
      />

      <motion.aside
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        aria-label={`${item.name} details`}
        className="fixed bottom-0 left-1/2 z-[53] flex max-h-[92vh] w-full max-w-[480px] -translate-x-1/2 flex-col overflow-hidden rounded-t-[30px] bg-[var(--bg)] shadow-[0_-24px_70px_-30px_rgba(20,19,26,.5)]"
      >
        {item.image_url ? (
          <div className="detail-hero shrink-0" style={{ backgroundImage: `url(${item.image_url})`, height: 300, borderRadius: "30px 30px 0 0" }}>
            <div className="detail-hero__top">
              <button
                type="button"
                onClick={onClose}
                className="detail-hero__btn"
                aria-label="Close item details"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="detail-hero__btn"
                  style={{ color: liked ? "var(--brand)" : "var(--ink)" }}
                  onClick={() => setLiked(l => !l)}
                  aria-label="Like item"
                >
                  <Heart size={18} fill={liked ? "currentColor" : "none"} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="detail-hero__btn"
                  aria-label="Share item"
                >
                  <Share2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-3 py-2 text-[13px] font-bold text-[var(--muted)]"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              Back
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-grid h-3 w-3 place-items-center rounded-[3px] border"
                  style={{ borderColor: foodColor }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: foodColor }} />
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]">
                  {item.food_type.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-[24px] font-black leading-tight tracking-normal">{item.name}</h1>
            </div>
            <div className="shrink-0 text-[22px] font-black text-[var(--brand-deep)]">
              {formatPrice(Number(item.price) + extraPrice)}
            </div>
          </div>

          {/* Meta row: prep time + calories pip */}
          <div className="detail-meta mt-3">
            {item.prep_time_minutes ? (
              <>
                <Clock3 size={13} />
                <b>{item.prep_time_minutes} min</b>
                <span className="pip" />
              </>
            ) : null}
            <Flame size={13} style={{ color: "var(--brand)" }} />
            <b style={{ color: "var(--brand)" }}>~620 kcal</b>
          </div>

          {item.description ? (
            <p className="detail-desc mt-0">{item.description}</p>
          ) : null}

          <div className="mt-5 space-y-5">
            {item.customizations.map((group) => (
              <section key={group.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-[13px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
                    {group.name}
                  </h2>
                  {group.is_required ? (
                    <span className="rounded-full bg-[var(--brand-tint)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--brand-deep)]">
                      Required
                    </span>
                  ) : null}
                </div>

                {group.group_type === "multi" ? (
                  <div className="space-y-2">
                    {group.options.map((option) => {
                      const isSelected = selected[group.id]?.includes(option.id) ?? false;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(group.id, option.id, group.group_type)}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--surface)] p-3 text-left transition-colors"
                          style={{ borderColor: isSelected ? "var(--ink)" : "var(--hairline)" }}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border"
                              style={{
                                background: isSelected ? "var(--brand)" : "var(--bg)",
                                borderColor: isSelected ? "var(--brand)" : "var(--hairline)",
                                color: "var(--surface)",
                              }}
                            >
                              {isSelected ? <Check size={13} strokeWidth={3} /> : null}
                            </span>
                            <span className="truncate text-[13px] font-bold">{option.label}</span>
                          </span>
                          {option.price_delta > 0 ? (
                            <span className="shrink-0 text-[12px] font-bold text-[var(--muted)]">
                              +{formatPrice(option.price_delta)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map((option) => {
                      const isSelected = selected[group.id]?.[0] === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(group.id, option.id, group.group_type)}
                          className="min-h-[62px] rounded-2xl border px-3 py-3 text-left transition-colors"
                          style={{
                            background: isSelected ? "var(--ink)" : "var(--surface)",
                            borderColor: isSelected ? "var(--ink)" : "var(--hairline)",
                            color: isSelected ? "var(--surface)" : "var(--ink)",
                          }}
                        >
                          <span className="block text-[13px] font-black">{option.label}</span>
                          {option.price_delta > 0 ? (
                            <span
                              className="mt-1 block text-[11px] font-bold"
                              style={{ color: isSelected ? "rgba(255,252,248,.68)" : "var(--muted)" }}
                            >
                              +{formatPrice(option.price_delta)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Special note */}
          <section className="mt-5">
            <h2 className="mb-3 text-[13px] font-black uppercase tracking-[0.08em] text-[var(--muted)]">
              Special note
            </h2>
            <div className="addon-row" style={{ cursor: "text", padding: "12px 14px" }}>
              <div className="addon-row__l" style={{ flex: 1 }}>
                <FileText size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. no onions, extra napkins…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[var(--muted-2)]"
                  style={{ border: 0, width: "100%" }}
                />
              </div>
            </div>
          </section>

          {error ? (
            <p className="mt-4 rounded-2xl bg-[rgba(224,58,48,.1)] px-4 py-3 text-[12px] font-bold text-[var(--red)]">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-[var(--hairline)] bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] px-5 pb-7 pt-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--surface)] p-1">
              <button
                type="button"
                onClick={() => setQty((current) => Math.max(1, current - 1))}
                className="grid h-10 w-10 place-items-center rounded-full text-[var(--ink)]"
                aria-label="Decrease quantity"
              >
                <Minus size={15} strokeWidth={2.8} />
              </button>
              <span className="min-w-7 text-center text-[14px] font-black">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((current) => current + 1)}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ink)] text-[var(--surface)]"
                aria-label="Increase quantity"
              >
                <Plus size={15} strokeWidth={2.8} />
              </button>
            </div>

            <motion.button
              type="button"
              onClick={handleAdd}
              whileTap={{ scale: 0.97 }}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 text-[14px] font-black text-[var(--surface)] shadow-[var(--sh-coral)]"
            >
              <ShoppingBag size={17} strokeWidth={2.4} />
              Add: {formatPrice(total)}
            </motion.button>
          </div>
        </footer>
      </motion.aside>
    </>
  );
}
