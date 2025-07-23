// CartContext.tsx - Only dummy cart logic is included here. For Supabase support, see SupabaseCart.ts.
import React, { createContext, ReactNode, useContext, useState } from "react";
import { Alert } from "react-native";

// Types
export interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image: string;
}

export interface CartItem {
  id: string; // product id
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function useDummyCart(): CartContextType {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading] = useState(false);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: product.id, product, quantity }];
    });
    Alert.alert("Added to cart", product.name);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  return { cart, addToCart, removeFromCart, clearCart, loading };
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const value = useDummyCart();
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
