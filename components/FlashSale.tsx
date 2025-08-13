import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
  discount?: number;
  main_image?: string;
  image_urls?: string[];
}

export function FlashSale({ products }: { products: any[] }) {
  const router = useRouter();
  const skeletonColor = useThemeColor(
    { light: "#e8e9eb", dark: "#23262F" },
    "background"
  );
  const loading = !products || products.length === 0;
  const skeletons = Array.from({ length: 4 });
  const [showScrollBar, setShowScrollBar] = useState(false);
  const scrollBarTimeout = useRef<number | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollBarColor = useThemeColor(
    { light: "#e0e0e0", dark: "#e0e0e0" },
    "background"
  );

  if (!products || products.length === 0) return null;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: () => {
        setShowScrollBar(true);
        if (scrollBarTimeout.current) clearTimeout(scrollBarTimeout.current);
        scrollBarTimeout.current = setTimeout(
          () => setShowScrollBar(false),
          2000
        );
      },
    }
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => (
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
          is_super_flash_sale: item.is_super_flash_sale,
          super_flash_price: item.super_flash_price,
        }}
        style={{ margin: 0 }}
      />
    </View>
  );

  // Calculate scroll bar position and width
  const productWidth = screenWidth * 0.42 + 12; // card width + margin
  const visibleWidth = screenWidth - 2 * Math.round(screenWidth * 0.04);
  const totalWidth = products.length * productWidth;
  const thumbWidth = screenWidth * 0.42 * 0.5; // 50% of product image width
  const maxScroll = Math.max(1, totalWidth - visibleWidth);
  const trackWidth = visibleWidth;
  const scrollBarTranslate = scrollX.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [0, trackWidth - thumbWidth],
    extrapolate: "clamp",
  });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Flash Sale</ThemedText>
        <Pressable onPress={() => router.push("/flash-sale")}>
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
      {showScrollBar && (
        <View style={styles.scrollBarContainer}>
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
    height: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    opacity: 1,
    overflow: "visible",
  },
  scrollBarThumb: {
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
    position: "absolute",
    left: 0,
    top: 0,
  },
});
