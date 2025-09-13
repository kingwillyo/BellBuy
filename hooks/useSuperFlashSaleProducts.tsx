import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
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

      // Filter out expired products on the client side
      const activeProducts =
        data?.filter((product) => {
          if (!product.super_flash_end) return true;
          return new Date(product.super_flash_end) > new Date();
        }) || [];

      setProducts(activeProducts);
    } catch (err: any) {
      console.error("Error fetching super flash sale products:", err);
      setError(err.message || "Failed to fetch super flash sale products");
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
