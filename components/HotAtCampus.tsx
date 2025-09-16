import { useThemeColor } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { handleNetworkError, withRetry } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { ProductCard } from "./ProductCard";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const screenWidth = Dimensions.get("window").width;

interface Product {
  id: string;
  name: string;
  price: number;
  main_image?: string;
  image_urls?: string[];
  created_at: string;
  view_count?: number;
  wishlist_count?: number;
}

export function HotAtCampus() {
  const router = useRouter();
  const { universityId } = useUserUniversity();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showScrollBar, setShowScrollBar] = useState(false);
  const scrollBarTimeout = useRef<number | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollBarColor = useThemeColor(
    { light: "#e0e0e0", dark: "#e0e0e0" },
    "background"
  );

  useEffect(() => {
    fetchTrendingProducts();
  }, [universityId]);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);

      const result = await withRetry(
        async () => {
          // Query for trending products based on university
          // We'll use recency, engagement metrics, and some randomization for trending effect
          const query = universityId
            ? supabase
                .from("products")
                .select(
                  `
                    id,
                    name,
                    price,
                    main_image,
                    image_urls,
                    created_at,
                    view_count,
                    wishlist_count
                  `
                )
                .eq("university_id", universityId)
                .eq("in_stock", true)
                .order("created_at", { ascending: false })
                .limit(10)
            : supabase
                .from("products")
                .select(
                  `
                    id,
                    name,
                    price,
                    main_image,
                    image_urls,
                    created_at,
                    view_count,
                    wishlist_count
                  `
                )
                .eq("in_stock", true)
                .order("created_at", { ascending: false })
                .limit(10);

          const { data, error } = await query;

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

      // Sort by trending score (recency + engagement + randomization for variety)
      const trendingProducts = (result || []).sort((a, b) => {
        const aScore = calculateTrendingScore(a);
        const bScore = calculateTrendingScore(b);
        return bScore - aScore;
      });

      setProducts(trendingProducts.slice(0, 8)); // Show top 8 trending products
    } catch (error: any) {
      console.error("Error fetching trending products:", error);
      setProducts([]);

      // Show user-friendly error handling
      handleNetworkError(error, {
        context: "loading trending products",
        onRetry: () => fetchTrendingProducts(),
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTrendingScore = (product: Product) => {
    const now = new Date();
    const createdAt = new Date(product.created_at);
    const daysSinceCreated =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Recent products get higher scores (within last 7 days)
    const recencyScore = Math.max(0, 7 - daysSinceCreated) / 7;

    // Engagement metrics (normalized)
    const viewScore = Math.min((product.view_count || 0) / 100, 1); // Cap at 1.0
    const wishlistScore = Math.min((product.wishlist_count || 0) / 20, 1); // Cap at 1.0

    // Add some randomization based on product ID for variety
    const randomFactor = (parseInt(product.id.slice(-2), 16) || 0) / 255;

    // Combine all factors with weights
    return (
      recencyScore * 0.4 +
      viewScore * 0.3 +
      wishlistScore * 0.2 +
      randomFactor * 0.1
    );
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: () => {
        setShowScrollBar(true);
        if (scrollBarTimeout.current) clearTimeout(scrollBarTimeout.current);
        scrollBarTimeout.current = setTimeout(
          () => setShowScrollBar(false),
          1500
        );
      },
    }
  );

  const renderItem = ({ item, index }: { item: Product; index: number }) => (
    <View
      style={[
        styles.productItem,
        index === products.length - 1 && { marginRight: 0 },
      ]}
    >
      <ProductCard
        key={item.id}
        product={{
          id: item.id,
          name: item.name,
          price: item.price,
          image:
            (item.main_image &&
              typeof item.main_image === "string" &&
              item.main_image) ||
            (item.image_urls && item.image_urls[0]) ||
            "https://via.placeholder.com/160x160?text=No+Image",
        }}
        style={{ margin: 0 }}
      />
    </View>
  );

  // Don't render if loading or no products (hide the entire section)
  if (loading || products.length === 0) return null;

  // Calculate scroll bar position and width - improved calculation
  const productWidth = screenWidth * 0.42 + 12; // card width + margin
  const visibleWidth = screenWidth - 2 * Math.round(screenWidth * 0.04);
  const totalWidth = products.length * productWidth;
  const thumbWidth = Math.max(40, (visibleWidth * visibleWidth) / totalWidth);
  const maxScroll = Math.max(0, totalWidth - visibleWidth);
  const scrollBarTranslate = scrollX.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [0, visibleWidth - thumbWidth],
    extrapolate: "clamp",
  });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">🔥 Hot at Campus</ThemedText>
        <Pressable onPress={() => router.push("/hot-at-campus")}>
          <ThemedText style={styles.seeMoreLink}>See More</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContent}
      />
      {showScrollBar && products.length > 1 && (
        <View style={styles.scrollBarContainer}>
          <View style={styles.scrollBarTrack}>
            <Animated.View
              style={[
                styles.scrollBarThumb,
                {
                  width: thumbWidth,
                  backgroundColor: scrollBarColor,
                  transform: [{ translateX: scrollBarTranslate }],
                },
              ]}
            />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeMoreLink: {
    color: "#0A84FF",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: Math.round(screenWidth * 0.04),
  },
  productItem: {
    marginRight: 10,
    margin: 0,
  },
  scrollBarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -20,
    alignItems: "center",
    justifyContent: "center",
    height: 10,
    zIndex: 10,
  },
  scrollBarTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  scrollBarThumb: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0A84FF",
    position: "absolute",
    left: 0,
    top: 0,
  },
});
