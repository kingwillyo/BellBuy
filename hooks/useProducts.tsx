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

        // Apply custom filters with whitelist validation
        const ALLOWED_FILTERS = [
          "category",
          "in_stock",
          "university_id",
          "seller_id",
          "condition",
          "status",
        ];

        Object.entries(filters).forEach(([key, value]) => {
          if (
            ALLOWED_FILTERS.includes(key) &&
            value !== undefined &&
            value !== null
          ) {
            // Special handling for price range filter
            if (
              key === "price_range" &&
              typeof value === "object" &&
              value !== null
            ) {
              const priceRange = value as { min?: number; max?: number };
              if (
                priceRange.min !== undefined &&
                typeof priceRange.min === "number"
              ) {
                query = query.gte("price", priceRange.min);
              }
              if (
                priceRange.max !== undefined &&
                typeof priceRange.max === "number"
              ) {
                query = query.lte("price", priceRange.max);
              }
            } else {
              // Validate value type based on expected column type
              if (key === "in_stock" && typeof value === "boolean") {
                query = query.eq(key, value);
              } else if (key === "category" && typeof value === "string") {
                query = query.eq(key, value);
              } else if (key === "university_id" && typeof value === "string") {
                query = query.eq(key, value);
              } else if (key === "seller_id" && typeof value === "string") {
                query = query.eq(key, value);
              } else if (key === "condition" && typeof value === "string") {
                query = query.eq(key, value);
              } else if (key === "status" && typeof value === "string") {
                query = query.eq(key, value);
              }
            }
          }
        });

        // Apply ordering with validation
        const ALLOWED_ORDER_COLUMNS = [
          "created_at",
          "updated_at",
          "price",
          "name",
          "view_count",
          "wishlist_count",
        ];

        const ALLOWED_ORDER_DIRECTIONS = ["asc", "desc"];

        if (ALLOWED_ORDER_COLUMNS.includes(orderBy.column)) {
          const direction = orderBy.ascending ? "asc" : "desc";
          if (ALLOWED_ORDER_DIRECTIONS.includes(direction)) {
            query = query.order(orderBy.column, {
              ascending: orderBy.ascending,
            });
          }
        }

        // Apply limit with validation
        const MAX_LIMIT = 100; // Prevent excessive data fetching
        const safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        query = query.limit(safeLimit);

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
