import { supabase } from "@/lib/supabase";
import { useEffect, useRef } from "react";

interface SuperFlashProduct {
  id: string;
  name: string;
  super_flash_end?: string;
  is_super_flash_sale: boolean;
}

export function useSuperFlashSaleExpiration(products: SuperFlashProduct[]) {
  const expirationTimersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const handleProductExpiration = async (product: SuperFlashProduct) => {
    try {
      console.log(`Super Flash Sale expired for product: ${product.name}`);

      // Update the database to disable the super flash sale
      const { error } = await supabase
        .from("products")
        .update({
          is_super_flash_sale: false,
          super_flash_start: null,
          super_flash_end: null,
          super_flash_price: null,
        })
        .eq("id", product.id);

      if (error) {
        console.error("Error updating expired product:", error);
      } else {
        console.log(
          `Successfully disabled Super Flash Sale for: ${product.name}`
        );
      }
    } catch (err) {
      console.error("Error handling product expiration:", err);
    }
  };

  const setExpirationTimer = (product: SuperFlashProduct) => {
    if (!product.super_flash_end) return;

    const endTime = new Date(product.super_flash_end).getTime();
    const now = new Date().getTime();
    const timeUntilExpiration = endTime - now;

    // Clear existing timer for this product
    if (expirationTimersRef.current[product.id]) {
      clearTimeout(expirationTimersRef.current[product.id]);
    }

    // If the product has already expired, handle it immediately
    if (timeUntilExpiration <= 0) {
      handleProductExpiration(product);
      return;
    }

    // Set timer for when the product will expire
    const timer = setTimeout(() => {
      handleProductExpiration(product);
      // Remove the timer reference
      delete expirationTimersRef.current[product.id];
    }, timeUntilExpiration);

    // Store the timer reference
    expirationTimersRef.current[product.id] = timer;
  };

  const clearExpirationTimers = () => {
    Object.values(expirationTimersRef.current).forEach((timer) => {
      clearTimeout(timer);
    });
    expirationTimersRef.current = {};
  };

  useEffect(() => {
    // Set up expiration timers for all products
    products.forEach((product) => {
      if (product.is_super_flash_sale && product.super_flash_end) {
        setExpirationTimer(product);
      }
    });

    // Cleanup function to clear all timers
    return () => {
      clearExpirationTimers();
    };
  }, [products]);

  return {
    clearExpirationTimers,
  };
}
