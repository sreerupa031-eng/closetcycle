// Cart context for receivers — stores item ids in localStorage, no auth needed.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type CartContextValue = {
  itemIds: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "closetcycle.cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemIds, setItemIds] = useState<string[]>([]);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItemIds(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itemIds));
    } catch {
      // ignore
    }
  }, [itemIds]);

  const value: CartContextValue = {
    itemIds,
    add: (id) => setItemIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    remove: (id) => setItemIds((prev) => prev.filter((x) => x !== id)),
    clear: () => setItemIds([]),
    has: (id) => itemIds.includes(id),
    count: itemIds.length,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
