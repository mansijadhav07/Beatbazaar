"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type LicenseTier = "free" | "non_exclusive" | "exclusive";

export interface CartItem {
  trackId: string;
  licenseTier: LicenseTier;
  trackTitle: string;
  producerName: string;
  coverKey?: string;
}

interface CartContextValue {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (trackId: string, licenseTier: CartItem["licenseTier"]) => void;
  clearCart: () => void;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "bb_cart_v1";

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Hydrate from localStorage once on mount (avoids SSR mismatch)
  useEffect(() => {
    setCart(loadFromStorage());
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage may be unavailable (private mode, quota exceeded)
    }
  }, [cart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      // Max 1 exclusive per track: if adding exclusive, remove all tiers for this track
      if (item.licenseTier === "exclusive") {
        const withoutTrack = prev.filter((c) => c.trackId !== item.trackId);
        return [...withoutTrack, item];
      }

      // No duplicate (trackId + licenseTier) pairs
      const alreadyIn = prev.some(
        (c) => c.trackId === item.trackId && c.licenseTier === item.licenseTier
      );
      if (alreadyIn) return prev;

      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback(
    (trackId: string, licenseTier: CartItem["licenseTier"]) => {
      setCart((prev) =>
        prev.filter(
          (c) => !(c.trackId === trackId && c.licenseTier === licenseTier)
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const itemCount = cart.length;

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
}
