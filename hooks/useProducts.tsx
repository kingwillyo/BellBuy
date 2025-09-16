import { logger } from "@/lib/logger";
import { handleNetworkError, withRetry } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";

interface UseProductsOptions {
  universityId?: string;
  limit?: number;
  filters?: Record<string, any>;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  enableAutoRetry?: boolean;
  retryOptions?: {
    maxRetries?: number;
    timeout?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
}

export function useProducts(options: UseProductsOptions = {}) {
  const {
    universityId,
    limit = 10,
    filters = {},
    orderBy = { column: "created_at", ascending: false },
    enableAutoRetry = true,
    retryOptions = {
      maxRetries: 3,
      timeout: 30000,
      baseDelay: 1000,
      maxDelay: 5000,
    },
  } = options;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await withRetry(async () => {
        let query = supabase.from("products").select(`
              id,
              name,
              price,
              main_image,
              image_urls,
              created_at,
              view_count,
              wishlist_count,
              category,
              description,
              in_stock
            `);

        // Apply university filter if provided
        if (universityId) {
          query = query.eq("university_id", universityId);
        }

        // Apply custom filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });

        // Apply ordering
        query = query.order(orderBy.column, { ascending: orderBy.ascending });

        // Apply limit
        if (limit > 0) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return data || [];
      }, retryOptions);

      setProducts(result);
    } catch (err: any) {
      logger.error("Error fetching products", err, {
        component: "useProducts",
        options,
      });

      setError(err.message || "Failed to fetch products");
      setProducts([]);

      if (enableAutoRetry) {
        handleNetworkError(err, {
          context: "loading products",
          onRetry: () => fetchProducts(),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    universityId,
    limit,
    JSON.stringify(filters),
    JSON.stringify(orderBy),
    enableAutoRetry,
    JSON.stringify(retryOptions),
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}
