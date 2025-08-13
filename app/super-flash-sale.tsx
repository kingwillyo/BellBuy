import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSuperFlashSaleProducts } from "@/hooks/useSuperFlashSaleProducts";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const screenWidth = Dimensions.get("window").width;

interface SuperFlashProduct {
  id: string;
  name: string;
  price: number;
  super_flash_price?: number;
  main_image?: string;
  image_urls?: string[];
  super_flash_end?: string;
  category: string;
  description?: string;
}

interface CountdownProps {
  endTime: string;
}

function CountdownTimer({ endTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const difference = end - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="time-outline" size={16} color="#FFFFFF" />
      <Text style={styles.countdownText}>
        {`${timeLeft.hours.toString().padStart(2, "0")}:${timeLeft.minutes
          .toString()
          .padStart(2, "0")}:${timeLeft.seconds.toString().padStart(2, "0")}`}
      </Text>
    </View>
  );
}

export default function SuperFlashSalePage() {
  const { products, loading, error, refetch } = useSuperFlashSaleProducts();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: SuperFlashProduct;
    index: number;
  }) => {
    const displayPrice = item.super_flash_price || item.price;
    const originalPrice = item.price;
    const discount =
      originalPrice > displayPrice
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0;

    return (
      <View style={styles.productItem}>
        <View style={styles.superFlashCard}>
          {item.super_flash_end && (
            <CountdownTimer endTime={item.super_flash_end} />
          )}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
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
                "https://via.placeholder.com/160x160?text=No+Image",
              is_super_flash_sale: true,
              super_flash_price: item.super_flash_price,
            }}
            style={{ margin: 0 }}
          />
          {originalPrice > displayPrice && (
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>
                ₦{originalPrice.toLocaleString()}
              </Text>
              <Text style={styles.superFlashPrice}>
                ₦{displayPrice.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <ThemedText type="title" style={styles.title}>
          🔥 Super Flash Sale
        </ThemedText>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <ThemedText style={styles.subtitle}>
        Limited time offers with amazing discounts!
      </ThemedText>
      {products.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>{products.length}</ThemedText>
            <ThemedText style={styles.statLabel}>Products</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statNumber}>
              {Math.max(
                ...products.map((p) => {
                  const original = p.price;
                  const discounted = p.super_flash_price || p.price;
                  return original > discounted
                    ? Math.round(((original - discounted) / original) * 100)
                    : 0;
                })
              )}
              %
            </ThemedText>
            <ThemedText style={styles.statLabel}>Max Discount</ThemedText>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="flash-outline" size={64} color="#888" />
      <ThemedText style={styles.emptyTitle}>No Super Flash Sales</ThemedText>
      <ThemedText style={styles.emptyText}>
        Check back later for amazing limited-time offers!
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          title: "Super Flash Sale",
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
        }}
      />

      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 12,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF4444",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 68, 68, 0.2)",
  },
  row: {
    justifyContent: "space-between",
  },
  productItem: {
    width: "48%",
    marginBottom: 16,
  },
  superFlashCard: {
    position: "relative",
  },
  countdownContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  countdownText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 8,
  },
  superFlashPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF4444",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
    paddingHorizontal: 32,
  },
});
 