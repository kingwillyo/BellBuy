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

interface FlashSaleProduct {
  id: string;
  name: string;
  price: number;
  discount?: number;
  main_image?: string;
  image_urls?: string[];
  flash_sale?: boolean;
  is_super_flash_sale?: boolean;
  super_flash_price?: number;
  super_flash_start?: string;
  super_flash_end?: string;
  category?: string;
  description?: string;
  created_at?: string;
}

// Error Boundary Component
class FlashSaleErrorBoundary extends React.Component<
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
    console.error("Flash Sale Error:", error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <ThemedText style={styles.errorTitle}>
            Something went wrong
          </ThemedText>
          <ThemedText style={styles.errorMessage}>
            Please try refreshing the page
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
        </View>
      );
    }

    return this.props.children;
  }
}

const LoadingSkeleton = () => {
  const skeletons = Array.from({ length: 6 });

  return (
    <FlatList
      data={skeletons}
      keyExtractor={(_, index) => `skeleton-${index}`}
      numColumns={2}
      renderItem={() => <SkeletonProductCard />}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.gridContainer,
        { paddingHorizontal: Math.round(screenWidth * 0.04) },
      ]}
      scrollEnabled={false}
    />
  );
};

export default function FlashSalePage() {
  const router = useRouter();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const [products, setProducts] = useState<FlashSaleProduct[]>([]);
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

  const fetchFlashSaleProducts = useCallback(
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

        // Try multiple query strategies for flash sale products
        const queries = [
          // Strategy 1: Look for flash_sale field
          universityId
            ? supabase
                .from("products")
                .select("*")
                .eq("flash_sale", true)
                .eq("university_id", universityId)
                .order("created_at", { ascending: false })
            : supabase
                .from("products")
                .select("*")
                .eq("flash_sale", true)
                .order("created_at", { ascending: false }),

          // Strategy 2: Look for is_super_flash_sale field
          universityId
            ? supabase
                .from("products")
                .select("*")
                .eq("is_super_flash_sale", true)
                .eq("university_id", universityId)
                .order("created_at", { ascending: false })
            : supabase
                .from("products")
                .select("*")
                .eq("is_super_flash_sale", true)
                .order("created_at", { ascending: false }),

          // Strategy 3: Look for discount field as fallback
          universityId
            ? supabase
                .from("products")
                .select("*")
                .not("discount", "is", null)
                .gt("discount", 0)
                .eq("university_id", universityId)
                .order("created_at", { ascending: false })
                .limit(20)
            : supabase
                .from("products")
                .select("*")
                .not("discount", "is", null)
                .gt("discount", 0)
                .order("created_at", { ascending: false })
                .limit(20),
        ];

        let flashSaleProducts: FlashSaleProduct[] = [];
        let queryError: any = null;

        // Try each query strategy
        for (let i = 0; i < queries.length; i++) {
          if (!isMountedRef.current) return;

          try {
            const { data, error } = await queries[i];

            if (error) {
              queryError = error;
              console.warn(`Query strategy ${i + 1} failed:`, error);
              continue;
            }

            if (data && data.length > 0) {
              flashSaleProducts = data;
              break;
            }
          } catch (err) {
            console.warn(`Query strategy ${i + 1} error:`, err);
            queryError = err;
          }
        }

        if (!isMountedRef.current) return;

        if (flashSaleProducts.length === 0 && queryError) {
          throw queryError;
        }

        setProducts(flashSaleProducts);
        setRetryCount(0); // Reset retry count on success
      } catch (err: any) {
        console.error("Flash sale fetch error:", err);

        if (!isMountedRef.current) return;

        if (err.name === "AbortError") {
          return; // Request was cancelled, don't show error
        }

        setError(err.message || "Failed to load flash sale products");

        // Use network error handling with retry
        handleNetworkError(err, {
          context: "loading flash sale products",
          onRetry: () => {
            setRetryCount(0);
            fetchFlashSaleProducts(isRefresh);
          },
          showAlert: false, // We handle errors in UI
        });

        // Implement exponential backoff for retries
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount((prev) => prev + 1);
              fetchFlashSaleProducts(isRefresh);
            }
          }, delay);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [retryCount]
  );

  useEffect(() => {
    fetchFlashSaleProducts();
  }, [fetchFlashSaleProducts, universityId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRetryCount(0);
    fetchFlashSaleProducts(true);
  }, [fetchFlashSaleProducts]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    fetchFlashSaleProducts();
  }, [fetchFlashSaleProducts]);

  const renderProduct = useCallback(
    ({ item, index }: { item: FlashSaleProduct; index: number }) => {
      return (
        <View style={styles.productItem}>
          <ProductCard
            product={{
              id: item.id || "",
              name: item.name || "Unknown Product",
              price:
                item.is_super_flash_sale && item.super_flash_price
                  ? item.super_flash_price
                  : item.price || 0,
              discount: item.discount,
              image:
                (item.main_image &&
                  typeof item.main_image === "string" &&
                  item.main_image) ||
                (item.image_urls &&
                  item.image_urls.length > 0 &&
                  item.image_urls[0]) ||
                "https://via.placeholder.com/160x160?text=No+Image",
              is_super_flash_sale: item.is_super_flash_sale || false,
              super_flash_price: item.super_flash_price,
            }}
          />
        </View>
      );
    },
    []
  );

  const renderEmptyState = useCallback(() => {
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <ThemedText style={styles.emptyTitle}>
            Unable to load flash sales
          </ThemedText>
          <ThemedText style={styles.emptyMessage}>{error}</ThemedText>
          <TouchableOpacity
            style={[
              styles.retryButton,
              {
                backgroundColor: `rgba(${
                  colors.tint === "#0A84FF" ? "10, 132, 255" : "79, 142, 247"
                }, 0.1)`,
                borderColor: colors.tint,
              },
            ]}
            onPress={handleRetry}
          >
            <ThemedText
              style={[styles.retryButtonText, { color: colors.tint }]}
            >
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flash-outline" size={64} color={colors.textTertiary} />
        <ThemedText style={styles.emptyTitle}>
          No Flash Sales Available
        </ThemedText>
        <ThemedText style={styles.emptyMessage}>
          Check back later for amazing deals!
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: `rgba(${
                colors.tint === "#0A84FF" ? "10, 132, 255" : "79, 142, 247"
              }, 0.1)`,
              borderColor: colors.tint,
            },
          ]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={colors.tint} />
          <ThemedText style={[styles.retryButtonText, { color: colors.tint }]}>
            Refresh
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }, [error, handleRetry, handleRefresh]);

  const getKeyExtractor = useCallback((item: FlashSaleProduct) => item.id, []);

  return (
    <FlashSaleErrorBoundary onError={handleRetry}>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="🔥 Flash Sale" showBackButton />

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <FlatList
            data={products}
            keyExtractor={getKeyExtractor}
            numColumns={2}
            renderItem={renderProduct}
            columnWrapperStyle={products.length > 0 ? styles.row : undefined}
            contentContainerStyle={
              products.length === 0
                ? styles.emptyContainerFlex
                : [
                    styles.gridContainer,
                    { paddingHorizontal: Math.round(screenWidth * 0.04) },
                  ]
            }
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                progressBackgroundColor={colors.background}
                tintColor={colors.tint}
              />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={6}
            getItemLayout={(data, index) => ({
              length: 270 + 12, // Product card height + margin
              offset: (270 + 12) * Math.floor(index / 2),
              index,
            })}
            onEndReachedThreshold={0.1}
          />
        )}

        {/* Loading indicator for retry attempts */}
        {retryCount > 0 && !loading && (
          <View
            style={[styles.retryIndicator, { backgroundColor: colors.overlay }]}
          >
            <ActivityIndicator size="small" color={colors.tint} />
            <ThemedText style={[styles.retryText, { color: colors.tint }]}>
              Retrying... ({retryCount}/3)
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </FlashSaleErrorBoundary>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header Styles
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  headerBack: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 22,
  },
  headerDivider: {
    height: 1,
    opacity: 0.15,
    marginBottom: 8,
  },
  // Grid Styles
  gridContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "flex-start",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productItem: {
    width: "48%",
    marginBottom: 12,
  },
  // Empty State Styles
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyContainerFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  // Error Boundary Styles
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B6B",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  // Button Styles
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Retry Indicator Styles
  retryIndicator: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
