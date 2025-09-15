import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWishlist } from "@/hooks/useWishlistProducts";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");
const itemWidth = (screenWidth - 48) / 2; // 16px padding on each side, 8px gap between

export default function WishlistScreen() {
  const { user, isLoading } = useAuth();
  const { wishlistProducts, loading, refreshWishlist } = useWishlist();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const products = wishlistProducts as any[];
  // Pad products array if odd length
  const displayProducts =
    products.length % 2 === 1 ? [...products, { id: "__dummy__" }] : products;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshWishlist();
    setRefreshing(false);
  }, [refreshWishlist]);
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);
  if (!isLoading && !user) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Wishlist" showBackButton />
      {/* Wishlist Products */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#fff"
          style={{ marginTop: 100 }}
        />
      ) : (
        <FlatList
          data={displayProducts}
          keyExtractor={(item, idx) => item.id || `dummy-${idx}`}
          renderItem={({ item }) => (
            <View
              style={{
                width: "48%",
                marginBottom: 12,
              }}
            >
              {item.id === "__dummy__" ? (
                <View style={{ width: "100%", aspectRatio: 1, opacity: 0 }} />
              ) : (
                <ProductCard
                  product={{
                    ...item,
                    image:
                      item.main_image ||
                      "https://via.placeholder.com/160x160?text=No+Image",
                  }}
                />
              )}
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 24, // even tighter spacing between header and cards
            paddingBottom: 32,
          }}
        />
      )}
    </View>
  );
}
