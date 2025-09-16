import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SkeletonProductCard } from "@/components/ui/Skeleton";
import { useColors } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { logger } from "../lib/logger";
import { handleNetworkError } from "../lib/networkUtils";
import { supabase } from "../lib/supabase";

const screenWidth = Dimensions.get("window").width;

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  main_image?: string;
  image_urls?: string[];
  category?: string;
  description?: string;
  created_at: string;
  view_count?: number;
  wishlist_count?: number;
}

// Error Boundary Component
class HotAtCampusErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("HotAtCampus Error Boundary caught an error", error, {
      component: "HotAtCampusErrorBoundary",
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Something went wrong loading trending products
          </ThemedText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onError();
            }}
          >
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

// Loading Skeleton Component
const LoadingSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <SkeletonProductCard />
        </View>
      ))}
    </View>
  );
};

export default function HotAtCampusPage() {
  const router = useRouter();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const { universityId } = useUserUniversity();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const calculateTrendingScore = (product: TrendingProduct) => {
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

  const fetchTrendingProducts = useCallback(
    async (isRefresh = false) => {
      if (!isMountedRef.current) return;

      try {
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        if (!isRefresh) {
          setLoading(true);
        }
        setError(null);

        logger.info("Fetching trending products", {
          component: "HotAtCampusPage",
          universityId,
          isRefresh,
        });

        // Query for trending products based on university
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
                category,
                description,
                created_at,
                view_count,
                wishlist_count
              `
              )
              .eq("university_id", universityId)
              .eq("in_stock", true)
              .order("created_at", { ascending: false })
          : supabase
              .from("products")
              .select(
                `
                id,
                name,
                price,
                main_image,
                image_urls,
                category,
                description,
                created_at,
                view_count,
                wishlist_count
              `
              )
              .eq("in_stock", true)
              .order("created_at", { ascending: false });

        const { data, error: queryError } = await query;

        if (!isMountedRef.current) return;

        if (queryError) {
          throw queryError;
        }

        if (data) {
          // Sort by trending score (recency + engagement + randomization for variety)
          const trendingProducts = data.sort((a, b) => {
            const aScore = calculateTrendingScore(a);
            const bScore = calculateTrendingScore(b);
            return bScore - aScore;
          });

          setProducts(trendingProducts);
          logger.info("Successfully fetched trending products", {
            component: "HotAtCampusPage",
            count: trendingProducts.length,
          });
        } else {
          setProducts([]);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        logger.error("Error fetching trending products", err, {
          component: "HotAtCampusPage",
          retryCount,
        });

        handleNetworkError(err, {
          context: "loading trending products",
          onRetry: () => {
            setRetryCount((prev) => prev + 1);
            fetchTrendingProducts();
          },
        });

        setError(err.message || "Failed to load trending products");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [universityId, retryCount]
  );

  useEffect(() => {
    fetchTrendingProducts();
  }, [fetchTrendingProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrendingProducts(true);
  }, [fetchTrendingProducts]);

  const renderItem = ({
    item,
    index,
  }: {
    item: TrendingProduct;
    index: number;
  }) => {
    const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

    return (
      <View style={styles.productItem}>
        <ProductCard
          product={{
            id: item.id,
            name: item.name,
            price: item.price,
            image:
              (item.main_image &&
                typeof item.main_image === "string" &&
                item.main_image) ||
              (item.image_urls && item.image_urls[0]) ||
              fallbackImage,
          }}
        />
      </View>
    );
  };

  const renderEmpty = () => (
    <ThemedView style={styles.emptyContainer}>
      <Ionicons name="flame-outline" size={64} color={colors.tint} />
      <ThemedText type="title" style={styles.emptyTitle}>
        No Trending Products
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Check back later for trending products at your campus
      </ThemedText>
      <TouchableOpacity
        style={[styles.exploreButton, { backgroundColor: colors.tint }]}
        onPress={() => router.push("/(tabs)/search")}
      >
        <ThemedText style={styles.exploreButtonText}>
          Explore Products
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="🔥 Hot at Campus" showBackButton />
        <LoadingSkeleton />
      </ThemedView>
    );
  }

  return (
    <HotAtCampusErrorBoundary onError={() => fetchTrendingProducts()}>
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="🔥 Hot at Campus" showBackButton />

        {error ? (
          <ThemedView style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
            <ThemedText type="title" style={styles.errorTitle}>
              Oops! Something went wrong
            </ThemedText>
            <ThemedText style={styles.errorSubtitle}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.tint }]}
              onPress={() => fetchTrendingProducts()}
            >
              <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <FlatList
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              styles.gridContainer,
              { paddingHorizontal: Math.round(screenWidth * 0.04) },
            ]}
          />
        )}
      </ThemedView>
    </HotAtCampusErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginRight: 40, // Compensate for back button width
    fontWeight: "bold",
    fontSize: 22,
  },
  headerSpacer: {
    width: 40,
  },
  gridContainer: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  productItem: {
    width: "48%",
    marginBottom: 12,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonItem: {
    width: "48%",
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.7,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  errorText: {
    textAlign: "center",
    marginBottom: 16,
  },
});
