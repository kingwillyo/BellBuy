import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    main_image: string;
    price: number;
    user_id: string; // Add seller_id to product
    is_super_flash_sale?: boolean;
    super_flash_price?: number;
    stock_quantity?: number;
    in_stock?: boolean;
  };
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  error: string | null;
  addToCart: (product_id: string) => Promise<void>;
  removeFromCart: (cart_item_id: string) => Promise<void>;
  updateQuantity: (cart_item_id: string, new_quantity: number) => Promise<void>;
  refreshCart: () => Promise<void>;
  totalPrice: number; // Added totalPrice
  clearCart: () => Promise<void>; // Add clearCart
  updateQuantityByProductId?: (
    product_id: string,
    new_quantity: number
  ) => Promise<void>; // Add this line
  // New helper functions for smart checkout
  getCartItemsBySeller: () => { [sellerId: string]: CartItem[] };
  getSellerTotals: () => {
    [sellerId: string]: { subtotal: number; shipping: number; total: number };
  };
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SHIPPING_FEE = 200; // NGN

  // Helper function to get the correct price for a product
  const getProductPrice = (product: CartItem["product"]) => {
    if (product.is_super_flash_sale && product.super_flash_price) {
      return product.super_flash_price;
    }
    return product.price;
  };

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        "id, product_id, quantity, product:product_id(id, name, main_image, price, user_id, is_super_flash_sale, super_flash_price, stock_quantity, in_stock)"
      )
      .eq("user_id", user.id);
    if (error) {
      // If error message contains HTML or 500, show a friendly message
      if (error.message.includes("<html>") || error.message.includes("500")) {
        setError("Unable to load cart. Please try again later.");
      } else {
        setError(error.message);
      }
      setCartItems([]);
    } else {
      // Fix: Map the data to match CartItem type (product should be an object, not an array)
      setCartItems(
        (data || []).map((item: any) => ({
          ...item,
          product: Array.isArray(item.product) ? item.product[0] : item.product,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [user, fetchCart]);

  const addToCart = async (product_id: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);

    // First, fetch the product to check stock availability
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock_quantity, in_stock")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      setError("Product not found");
      setLoading(false);
      return;
    }

    // Check if product is in stock
    if (!product.in_stock || product.stock_quantity <= 0) {
      setError("This product is out of stock");
      setLoading(false);
      return;
    }

    // Check if item already in cart
    const existing = cartItems.find((item) => item.product_id === product_id);
    if (existing) {
      // Check if adding one more would exceed stock
      if (existing.quantity >= product.stock_quantity) {
        // Don't show error, just silently prevent the action
        setLoading(false);
        return;
      }
      await updateQuantity(existing.id, existing.quantity + 1);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id,
      quantity: 1,
    });
    if (error) setError(error.message);
    await fetchCart();
    setLoading(false);
  };

  const removeFromCart = async (cart_item_id: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cart_item_id);
    if (error) setError(error.message);
    await fetchCart();
    setLoading(false);
  };

  const updateQuantity = async (cart_item_id: string, new_quantity: number) => {
    setLoading(true);
    setError(null);
    if (new_quantity <= 0) {
      await removeFromCart(cart_item_id);
      setLoading(false);
      return;
    }

    // Find the cart item to get product info
    const cartItem = cartItems.find((item) => item.id === cart_item_id);
    if (cartItem) {
      // Check stock availability
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock_quantity, in_stock")
        .eq("id", cartItem.product_id)
        .single();

      if (productError || !product) {
        setError("Product not found");
        setLoading(false);
        return;
      }

      if (!product.in_stock || product.stock_quantity <= 0) {
        setError("This product is out of stock");
        setLoading(false);
        return;
      }

      if (new_quantity > product.stock_quantity) {
        // Don't show error, just silently prevent the action
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: new_quantity })
      .eq("id", cart_item_id);
    if (error) setError(error.message);
    await fetchCart();
    setLoading(false);
  };

  const updateQuantityByProductId = async (
    product_id: string,
    new_quantity: number
  ) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    if (new_quantity <= 0) {
      // Remove the item if quantity is zero
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product_id);
      if (error) setError(error.message);
      await fetchCart();
      setLoading(false);
      return;
    }

    // Check stock availability
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock_quantity, in_stock")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      setError("Product not found");
      setLoading(false);
      return;
    }

    if (!product.in_stock || product.stock_quantity <= 0) {
      setError("This product is out of stock");
      setLoading(false);
      return;
    }

    if (new_quantity > product.stock_quantity) {
      // Don't show error, just silently prevent the action
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: new_quantity })
      .eq("user_id", user.id)
      .eq("product_id", product_id);
    if (error) setError(error.message);
    await fetchCart();
    setLoading(false);
  };

  const clearCart = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);
    if (error) setError(error.message);
    await fetchCart();
    setLoading(false);
  };

  const getCartItemsBySeller = () => {
    return cartItems.reduce(
      (acc, item) => {
        const sellerId = item.product.user_id;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      },
      {} as { [sellerId: string]: CartItem[] }
    );
  };

  const getSellerTotals = () => {
    const cartBySeller = getCartItemsBySeller();
    return Object.entries(cartBySeller).reduce(
      (acc, [sellerId, items]) => {
        const subtotal = items.reduce(
          (sum, item) => sum + getProductPrice(item.product) * item.quantity,
          0
        );
        const shipping = 0; // Placeholder, will be calculated later
        const total = subtotal + shipping;
        acc[sellerId] = { subtotal, shipping, total };
        return acc;
      },
      {} as {
        [sellerId: string]: {
          subtotal: number;
          shipping: number;
          total: number;
        };
      }
    );
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value: CartContextType & {
    updateQuantityByProductId?: typeof updateQuantityByProductId;
  } = {
    cartItems,
    loading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    refreshCart: fetchCart,
    totalPrice: cartItems.reduce(
      (sum, item) => sum + getProductPrice(item.product) * item.quantity,
      0
    ), // Don't add shipping fee here, let individual screens handle it
    clearCart, // Add clearCart to context value
    updateQuantityByProductId,
    getCartItemsBySeller,
    getSellerTotals,
    getTotalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
