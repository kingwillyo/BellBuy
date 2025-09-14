import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { withRetry, handleNetworkError } from "@/lib/networkUtils";
import { Product } from "@/types/product";
import { useState, useEffect } from "react";
import { useUserUniversity } from "./useUserUniversity";

interface SuperFlashProduct {
  id: string;
  name: string;
  price: number;
  super_flash_price?: number;
  main_image?: string;
  image_urls?: string[];
  super_flash_start?: string;
  super_flash_end?: string;
  is_super_flash_sale: boolean;
  category: string;
  description?: string;
  created_at?: string;
}

export function useSuperFlashSaleProducts() {
  const [products, setProducts] = useState<SuperFlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { universityId } = useUserUniversity();

  const fetchSuperFlashSaleProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch if user has a university
      if (!universityId) {
        setProducts([]);
        return;
      }

      const result = await withRetry(
        async () => {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("is_super_flash_sale", true)
            .eq("university_id", universityId)
            .order("created_at", { ascending: false })
            .limit(10);

          if (error) {
            throw error;
          }

          return data;
        },
        {
          maxRetries: 3,
          timeout: 30000, // 30 seconds
          baseDelay: 1000,
          maxDelay: 5000,
        }
      );

      // Filter out expired products on the client side
      const activeProducts =
        result?.filter((product) => {
          if (!product.super_flash_end) return true;
          return new Date(product.super_flash_end) > new Date();
        }) || [];

      setProducts(activeProducts);
    } catch (err: any) {
      logger.error("Error fetching super flash sale products", err, { component: "useSuperFlashSaleProducts" });
      setError(err.message || "Failed to fetch super flash sale products");
      
      // Show user-friendly error handling
      handleNetworkError(err, {
        context: "loading super flash sale products",
        onRetry: () => fetchSuperFlashSaleProducts(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperFlashSaleProducts();

    // Set up an interval to refresh products every minute to update countdowns
    const interval = setInterval(() => {
      fetchSuperFlashSaleProducts();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [universityId]);

  return {
    products,
    loading,
    error,
    refetch: fetchSuperFlashSaleProducts,
  };
}
