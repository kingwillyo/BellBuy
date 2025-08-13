import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ProductCard } from "./ProductCard";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const screenWidth = Dimensions.get("window").width;

interface SuperFlashProduct {
  id: string;
  name: string;
  price: number;
  super_flash_price?: number;
  main_image?: string;
  image_urls?: string[];
  super_flash_end?: string;
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
      <Text style={styles.countdownText}>
        {`${timeLeft.hours.toString().padStart(2, "0")}:${timeLeft.minutes
          .toString()
          .padStart(2, "0")}:${timeLeft.seconds.toString().padStart(2, "0")}`}
      </Text>
    </View>
  );
}

export function SuperFlashSale({
  products,
}: {
  products: SuperFlashProduct[];
}) {
  const router = useRouter();
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
      <View
        style={[
          styles.productItem,
          index === products.length - 1 && { marginRight: 0 },
        ]}
      >
        <View style={styles.superFlashCard}>
          {item.super_flash_end && (
            <CountdownTimer endTime={item.super_flash_end} />
          )}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
          <ProductCard
            key={item.id}
            product={{
              id: item.id,
              name: item.name,
              price: displayPrice,
              image:
                (item.main_image &&
                  typeof item.main_image === "string" &&
                  item.main_image) ||
                (item.image_urls && item.image_urls[0]) ||
                "https://via.placeholder.com/160x160?text=No+Image",
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
        <View style={styles.titleContainer}>
          <ThemedText type="subtitle" style={styles.title}>
            🔥 Super Flash Sale
          </ThemedText>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/super-flash-sale")}>
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  },
  countdownText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
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
  scrollBarThumb: {
    height: 4,
    borderRadius: 2,
    opacity: 0.8,
    position: "absolute",
    left: 0,
    top: 0,
  },
});
 