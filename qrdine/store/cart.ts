import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartCustomization {
  groupName: string;
  optionLabel: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  food_type: string;
  customizations: CartCustomization[];
  note?: string;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  tableId: string | null;
  restaurantSlug: string | null;

  setRestaurantContext: (restaurantId: string, tableId: string, slug: string) => void;
  addItem: (item: Omit<CartItem, "id" | "quantity">, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNote: (id: string, note: string) => void;
  clearCart: () => void;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const customExtra = item.customizations.reduce((s, c) => s + c.priceDelta, 0);
    return sum + (item.price + customExtra) * item.quantity;
  }, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      tableId: null,
      restaurantSlug: null,

      setRestaurantContext(restaurantId, tableId, slug) {
        const current = get().restaurantId;
        if (current && current !== restaurantId) {
          set({ items: [], restaurantId, tableId, restaurantSlug: slug });
        } else {
          set({ restaurantId, tableId, restaurantSlug: slug });
        }
      },

      addItem(item, quantity = 1) {
        const customKey = item.customizations.map(c => `${c.groupName}:${c.optionLabel}`).join("|");
        const existingId = get().items.findIndex(
          i => i.menuItemId === item.menuItemId && i.customizations.map(c => `${c.groupName}:${c.optionLabel}`).join("|") === customKey
        );
        if (existingId >= 0) {
          set(state => ({
            items: state.items.map((it, idx) =>
              idx === existingId ? { ...it, quantity: it.quantity + quantity } : it
            ),
          }));
        } else {
          set(state => ({
            items: [...state.items, { ...item, id: `${item.menuItemId}-${Date.now()}`, quantity }],
          }));
        }
      },

      removeItem(id) {
        set(state => ({ items: state.items.filter(i => i.id !== id) }));
      },

      updateQuantity(id, quantity) {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set(state => ({ items: state.items.map(i => i.id === id ? { ...i, quantity } : i) }));
      },

      updateNote(id, note) {
        set(state => ({ items: state.items.map(i => i.id === id ? { ...i, note } : i) }));
      },

      clearCart() {
        set({ items: [] });
      },
    }),
    {
      name: "scanbite-cart",
      partialize: (state) => ({
        items: state.items,
        restaurantId: state.restaurantId,
        tableId: state.tableId,
        restaurantSlug: state.restaurantSlug,
      }),
    }
  )
);
