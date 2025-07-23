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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const mystyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#181A20",
    paddingHorizontal: 16,
    zIndex: 10,
    // No extra vertical padding
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    // No extra padding or margin
  },
});

const { width: screenWidth } = Dimensions.get("window");
const itemWidth = (screenWidth - 48) / 2; // 16px padding on each side, 8px gap between

export default function WishlistScreen() {
  const { user, isLoading } = useAuth();
  const { wishlistProducts, loading, refreshWishlist } = useWishlist();
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const insets = useSafeAreaInsets();
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
      {/* Remove default header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom Header - fixed to top */}
      <View
        style={[
          mystyles.header,
          { paddingTop: insets.top, height: 36 + insets.top, backgroundColor },
        ]}
      >
        <TouchableOpacity
          style={mystyles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        <Text style={[mystyles.headerTitle, { color: textColor }]}>
          Wishlist
        </Text>
      </View>
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
