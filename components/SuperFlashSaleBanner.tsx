import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
    <View style={styles.timerContainer}>
      <View style={styles.timerBox}>
        <Text style={styles.timerNumber}>
          {timeLeft.hours.toString().padStart(2, "0")}
        </Text>
      </View>
      <Text style={styles.timerSeparator}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerNumber}>
          {timeLeft.minutes.toString().padStart(2, "0")}
        </Text>
      </View>
      <Text style={styles.timerSeparator}>:</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerNumber}>
          {timeLeft.seconds.toString().padStart(2, "0")}
        </Text>
      </View>
    </View>
  );
}

export function SuperFlashSaleBanner({
  products,
}: {
  products: SuperFlashProduct[];
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Only show banner if there are Super Flash Sale products
  if (!products || products.length === 0) return null;

  const handleProductPress = (product: SuperFlashProduct) => {
    router.push(`/(product)/${product.id}`);
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
      <Pressable
        style={[
          styles.bannerItem,
          index === products.length - 1 && styles.lastBannerItem,
        ]}
        onPress={() => handleProductPress(item)}
      >
        <Image
          source={{
            uri:
              (item.main_image &&
                typeof item.main_image === "string" &&
                item.main_image) ||
              (item.image_urls && item.image_urls[0]) ||
              "https://via.placeholder.com/400x200?text=No+Image",
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Dark overlay for better text readability */}
        <View style={styles.darkOverlay} />

        {/* Content overlay */}
        <View style={styles.contentOverlay}>
          {/* Top section with Super Flash Sale text and percentage */}
          <View style={styles.topSection}>
            <Text style={styles.superFlashTitle}>Super Flash Sale</Text>
            <Text style={styles.percentageOff}>{discount}% Off</Text>
          </View>

          {/* Bottom section with countdown timer */}
          <View style={styles.bottomSection}>
            {item.super_flash_end && (
              <CountdownTimer endTime={item.super_flash_end} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const onViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.flatListContent}
        snapToInterval={screenWidth - 32 + 16}
        decelerationRate="fast"
        getItemLayout={(data, index) => ({
          length: screenWidth - 32 + 16,
          offset: (screenWidth - 32 + 16) * index,
          index,
        })}
      />

      {/* Pagination dots */}
      <View style={styles.paginationContainer}>
        {Array.from({ length: Math.min(products.length, 5) }).map(
          (_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.activePaginationDot,
              ]}
            />
          )
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  flatListContent: {
    paddingHorizontal: 16,
  },
  bannerItem: {
    width: screenWidth - 32, // Full width minus horizontal padding
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    marginRight: 16,
  },
  lastBannerItem: {
    marginRight: 0, // Remove margin for the last item
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.39)",
  },
  contentOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "flex-start",
  },
  superFlashTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  percentageOff: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    alignItems: "flex-start",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerBox: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  timerNumber: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  timerSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginHorizontal: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0, 122, 255, 0.3)",
  },
  activePaginationDot: {
    backgroundColor: "#007AFF",
  },
});
