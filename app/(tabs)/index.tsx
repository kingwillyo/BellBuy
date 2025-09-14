/* eslint-disable @typescript-eslint/no-unused-vars */
import { CategoryRow } from "@/components/CategoryRow";
import { FlashSale } from "@/components/FlashSale";
import { HomeHeader } from "@/components/HomeHeader";
import { HotAtCampus } from "@/components/HotAtCampus";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanner } from "@/components/PromoBanner";
import { SuperFlashSaleBanner } from "@/components/SuperFlashSaleBanner";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SkeletonProductCard } from "@/components/ui/Skeleton";
import { Spacing } from "@/constants/Colors";
import { useSuperFlashSaleExpiration } from "@/hooks/useSuperFlashSaleExpiration";
import { useSuperFlashSaleProducts } from "@/hooks/useSuperFlashSaleProducts";
import { useColors } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { handleNetworkError } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  main_image?: string;
  image_urls?: string[];
  flash_sale?: boolean;
  is_super_flash_sale?: boolean;
  super_flash_price?: number;
  created_at?: string;
}

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const name = params.name as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [regularProducts, setRegularProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const colors = useColors();

  // Fetch Super Flash Sale products
  const { products: superFlashSaleProducts, loading: superFlashLoading } =
    useSuperFlashSaleProducts();

  // Handle automatic expiration of Super Flash Sale products
  useSuperFlashSaleExpiration(superFlashSaleProducts);

  // Get user's university for filtering
  const { universityId } = useUserUniversity();

  // Change sorting so flash_sale products are last
  function sortFlashSaleLast(array: Product[]): Product[] {
    return [...array].sort((a, b) => {
      if (a.flash_sale && !b.flash_sale) return 1;
      if (!a.flash_sale && b.flash_sale) return -1;
      return 0;
    });
  }

  useEffect(() => {
    fetchProducts();
  }, [universityId]);

  const fetchProducts = async () => {
    try {
      // Fetch products with or without university filter for backward compatibility
      const query = universityId
        ? supabase
            .from("products")
            .select("*")
            .eq("university_id", universityId)
            .order("created_at", { ascending: false })
        : supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setProducts(data);
        const flashSales = data
          .filter((p) => p.flash_sale === true)
          .slice(0, 10);
        setFlashSaleProducts(flashSales);
      }
    } catch (err: any) {
      handleNetworkError(err, {
        context: "loading products",
        onRetry: fetchProducts,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  return (
    <ThemedView style={styles.container}>
      <HomeHeader />
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        >
          <SuperFlashSaleBanner products={superFlashSaleProducts} />
          <CategoryRow />
          {flashSaleProducts.length > 0 && (
            <FlashSale products={flashSaleProducts} />
          )}
          <HotAtCampus />
          <ThemedView style={styles.productsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Campus Picks
            </ThemedText>
            {products.length === 0 && refreshing === false ? (
              // Show skeleton loader while loading
              <View style={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {sortFlashSaleLast(products).map((item) => (
                  <View
                    key={item.id}
                    style={{ width: "48%", marginBottom: 12 }}
                  >
                    <ProductCard
                      product={{
                        id: item.id,
                        name: item.name,
                        price: Math.round(item.price),
                        image:
                          (item.main_image &&
                            typeof item.main_image === "string" &&
                            item.main_image) ||
                          (item.image_urls && item.image_urls[0]) ||
                          fallbackImage,
                        is_super_flash_sale: item.is_super_flash_sale,
                        super_flash_price: item.super_flash_price,
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
            {products.length === 0 && refreshing === false && (
              <ThemedText
                type="body"
                variant="secondary"
                style={styles.emptyText}
              >
                No campus deals here right now.
              </ThemedText>
            )}
          </ThemedView>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  productsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    justifyContent: "flex-start",
  },
  productItem: {
    width: "48%",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    justifyContent: "flex-start",
  },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.xxxxl,
  },
});
