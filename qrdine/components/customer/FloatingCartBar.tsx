"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { ButtonWithIcon } from "@/components/ui/button-with-icon";

interface Props {
  itemCount: number;
  subtotal: number;
  restaurantSlug: string;
  onOpenCart: () => void;
}

export function FloatingCartBar({ itemCount, subtotal, restaurantSlug, onOpenCart }: Props) {
  return (
    <AnimatePresence>
      {itemCount > 0 ? (
        <motion.div
          initial={{ y: 110, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 110, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--ink)] p-2 pl-3 shadow-[0_18px_40px_-14px_rgba(20,19,26,.55)]"
        >
          <button
            type="button"
            onClick={onOpenCart}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-full text-left text-[var(--surface)]"
          >
            <motion.span
              key={itemCount}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-sm font-black"
            >
              {itemCount}
            </motion.span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-black">View bag</span>
              <span className="block text-[11px] font-semibold text-[rgba(255,252,248,.62)]">
                ₹{subtotal.toFixed(0)}
              </span>
            </span>
          </button>

          <Link href={`/m/${restaurantSlug}/checkout`} className="shrink-0 no-underline">
            <ButtonWithIcon
              type="button"
              variant="brand"
              icon={<ShoppingBag size={15} strokeWidth={2.4} />}
            >
              Order
            </ButtonWithIcon>
          </Link>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
