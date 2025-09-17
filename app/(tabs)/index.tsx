/* eslint-disable @typescript-eslint/no-unused-vars */
import { CategoryRow } from "@/components/CategoryRow";
import { FlashSale } from "@/components/FlashSale";
import { HomeHeader } from "@/components/HomeHeader";
import { HotAtCampus } from "@/components/HotAtCampus";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanner } from "@/components/PromoBanner";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SkeletonProductCard } from "@/components/ui/Skeleton";
import { Spacing } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { executeWithOfflineSupport } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { OfflinePlaceholder } from "../../components/OfflinePlaceholder";
import { useOffline } from "../../context/OfflineContext";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  main_image?: string;
  image_urls?: string[];
  flash_sale?: boolean;
  created_at?: string;
}

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const name = params.name as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredListingProducts, setFeaturedListingProducts] = useState<
    Product[]
  >([]);
  const [regularProducts, setRegularProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const colors = useColors();
  const { isOffline, addToRetryQueue } = useOffline();
  const colorScheme = useColorScheme();
  const statusBarBg = colors.background;
  const statusBarStyle =
    colorScheme === "dark" ? "light-content" : "dark-content";

  // Get user's university for filtering
  const { universityId } = useUserUniversity();

  // Change sorting so featured listing products are last
  function sortFeaturedListingLast(array: Product[]): Product[] {
    return [...array].sort((a, b) => {
      if (a.flash_sale && !b.flash_sale) return 1;
      if (!a.flash_sale && b.flash_sale) return -1;
      return 0;
    });
  }

  useEffect(() => {
    fetchProducts();
  }, [universityId]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);

    const result = await executeWithOfflineSupport(
      async () => {
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

        return data || [];
      },
      {
        context: "loading products",
        addToRetryQueue: true,
        showOfflineMessage: false,
        onOfflineAction: () => {
          // If offline, try to load cached data or show cached content
          // For now, we'll just show loading state
        },
      }
    );

    if (result) {
      setProducts(result);
      const featuredListings = result
        .filter((p) => p.flash_sale === true)
        .slice(0, 10);
      setFeaturedListingProducts(featuredListings);
    }

    setIsLoading(false);
  }, [universityId, addToRetryQueue]);

  // Reload home screen data whenever the home tab is focused
  useFocusEffect(
    useCallback(() => {
      // Only reload if we're not already loading and not refreshing
      // This ensures fresh data every time user taps the home tab
      if (!isLoading && !refreshing) {
        fetchProducts();
      }
    }, [isLoading, refreshing, fetchProducts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  // Show offline placeholder when offline and no cached data
  if (isOffline && products.length === 0 && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={statusBarBg}
          translucent
        />
        <HomeHeader />
        <OfflinePlaceholder
          title="You're Offline"
          message="Connect to the internet to browse products and discover great deals on campus."
          showRetryButton={true}
          onRetry={fetchProducts}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBg}
        translucent
      />
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
          <CategoryRow />
          {featuredListingProducts.length > 0 && (
            <FlashSale products={featuredListingProducts} />
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
                {sortFeaturedListingLast(products).map((item) => (
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
