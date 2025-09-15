import { logger } from "./logger";
import { supabase } from "./supabase";

/**
 * Safely deletes a product and all its related data
 * This function handles cascade deletion of wishlist items, cart items, etc.
 */
export async function deleteProductSafely(
  productId: string,
  userId: string
): Promise<{
  success: boolean;
  error?: string;
  deletedFromWishlists?: number;
  deletedFromCarts?: number;
}> {
  try {
    // First, verify the user owns this product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, user_id")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    if (product.user_id !== userId) {
      return {
        success: false,
        error: "You can only delete your own products",
      };
    }

    // Get counts before deletion for user feedback
    const { count: wishlistCount } = await supabase
      .from("wishlist")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);

    const { count: cartCount } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId);

    // Delete the product (this will cascade to wishlist, cart_items, etc.)
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      logger.error("Product deletion failed", deleteError, {
        component: "product-utils",
      });
      return {
        success: false,
        error: deleteError.message,
      };
    }

    logger.info(
      "Product deleted successfully",
      {
        productId,
        deletedFromWishlists: wishlistCount || 0,
        deletedFromCarts: cartCount || 0,
      },
      { component: "product-utils" }
    );

    return {
      success: true,
      deletedFromWishlists: wishlistCount || 0,
      deletedFromCarts: cartCount || 0,
    };
  } catch (error) {
    logger.error("Unexpected error during product deletion", error, {
      component: "product-utils",
    });
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Checks if a product can be safely deleted
 * (i.e., not part of any active orders)
 */
export async function canDeleteProduct(productId: string): Promise<{
  canDelete: boolean;
  reason?: string;
}> {
  try {
    // Check if product is in any active orders (not delivered or cancelled)
    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(
        `
        id,
        order:orders!inner(
          id,
          status
        )
      `
      )
      .eq("product_id", productId)
      .in("order.status", ["pending", "processing", "shipped"]);

    if (error) {
      logger.error("Error checking order items", error, {
        component: "product-utils",
      });
      return {
        canDelete: false,
        reason: "Unable to verify order status",
      };
    }

    if (orderItems && orderItems.length > 0) {
      return {
        canDelete: false,
        reason:
          "Product is part of active orders (pending, processing, or shipped) and cannot be deleted",
      };
    }

    return { canDelete: true };
  } catch (error) {
    logger.error("Error checking if product can be deleted", error, {
      component: "product-utils",
    });
    return {
      canDelete: false,
      reason: "Unable to verify deletion eligibility",
    };
  }
}
