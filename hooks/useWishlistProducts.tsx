import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types/product";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface WishlistContextType {
  wishlistProducts: any[];
  loading: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wishlist")
      .select("product:product_id(*)")
      .eq("user_id", user.id);
    if (error) {
      logger.error("Wishlist fetch error", { message: error.message }, { component: "WishlistProvider" });
      setWishlistProducts([]);
    } else {
      setWishlistProducts(data.map((entry: any) => entry.product));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchWishlist();
    else setWishlistProducts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addToWishlist = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("wishlist")
      .insert([{ user_id: user.id, product_id: productId }]);
    if (error) {
      logger.error("Add to wishlist error", { message: error.message }, { component: "WishlistProvider" });
    } else {
      await fetchWishlist();
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    if (error) {
      logger.error("Remove from wishlist error", { message: error.message }, { component: "WishlistProvider" });
    } else {
      await fetchWishlist();
    }
  };

  const isInWishlist = (productId: string) =>
    wishlistProducts.some((p) => p.id === productId);

  return (
    <WishlistContext.Provider
      value={{
        wishlistProducts,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        refreshWishlist: fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
