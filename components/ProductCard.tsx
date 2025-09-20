/* eslint-disable @typescript-eslint/no-unused-vars */
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWishlist } from "@/hooks/useWishlistProducts";
import {
  getItemWidth,
  getResponsiveFontSize,
  getResponsiveGap,
  getResponsivePadding,
  isTabletOrLarger,
} from "@/lib/responsiveUtils";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  Pressable as RNPressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { ThemedText } from "./ThemedText";

const { width: screenWidth } = Dimensions.get("window");

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  image: string;
}

interface ProductCardProps {
  product: Product;
  width?: number;
  style?: any;
}

export const ProductCard = forwardRef<View, ProductCardProps>(
  ({ product, width: customWidth, style: propsStyle }, ref) => {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === "dark";
    const cardBackgroundColor = useThemeColor(
      { light: "#F5F5F5", dark: "#282828" },
      "background"
    );
    const borderColor = useThemeColor(
      { light: "#E0E0E0", dark: "#404040" },
      "backgroundSecondary"
    );
    const iconColor = colorScheme === "dark" ? "#fff" : "#222";
    const heartBgColor = colorScheme === "dark" ? "rgba(0,0,0,0.7)" : "#fff";

    // Responsive calculations
    const isTablet = isTabletOrLarger();
    const responsiveItemWidth = customWidth || getItemWidth();
    const responsivePadding = getResponsivePadding(12);
    const responsiveGap = getResponsiveGap();

    const { user, isLoading } = useAuth();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const inWishlist = isInWishlist(product.id);
    const [wishlistLoading, setWishlistLoading] = useState(false);

    const handleWishlistToggle = async () => {
      if (!user) {
        router.replace("/auth/signin");
        return;
      }

      setWishlistLoading(true);

      try {
        if (inWishlist) {
          await removeFromWishlist(product.id);
          Toast.show({
            type: "wishlist",
            text1: "Removed from wishlist",
            visibilityTime: 2000,
            position: "top",
            topOffset: 60,
          });
        } else {
          await addToWishlist(product.id);
          Toast.show({
            type: "wishlist",
            text1: "Added to wishlist",
            visibilityTime: 2000,
            position: "top",
            topOffset: 60,
          });
        }
      } catch (error) {
        Toast.show({
          type: "error",
          text1: "Action failed",
          text2: "Please try again",
          visibilityTime: 2000,
          position: "top",
          topOffset: 60,
        });
      } finally {
        setWishlistLoading(false);
      }
    };

    const handlePress = () => {
      router.push({
        pathname: "/(product)/[id]",
        params: {
          id: product.id,
          name: product.name,
          price: product.price.toString(),
          images: JSON.stringify([product.image]),
        },
      });
    };

    const [imageError, setImageError] = useState(false);
    const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        style={[
          styles.productCard,
          {
            backgroundColor: cardBackgroundColor,
            borderColor: borderColor,
            width: customWidth || responsiveItemWidth,
            flex: customWidth ? undefined : 1,
            minWidth: isTablet ? 160 : 140,
            maxWidth: isTablet ? 280 : 240,
          },
          propsStyle,
        ]}
      >
        {/* Heart icon at top right */}
        <Pressable
          style={[styles.heartIcon, { backgroundColor: heartBgColor }]}
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            handleWishlistToggle();
          }}
          disabled={wishlistLoading}
        >
          {wishlistLoading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons
              name={inWishlist ? "heart" : "heart-outline"}
              size={28}
              color={iconColor}
            />
          )}
        </Pressable>
        <ExpoImage
          source={{
            uri: imageError || !product.image ? fallbackImage : product.image,
          }}
          style={[styles.productImage, { aspectRatio: 1 }]}
          resizeMode="contain"
          onError={() => setImageError(true)}
          cachePolicy="memory-disk"
        />
        {product.discount && (
          <View style={styles.discountBadge} pointerEvents="none">
            <ThemedText style={styles.discountText}>
              -{product.discount}%
            </ThemedText>
          </View>
        )}
        <View style={styles.productInfo}>
          <View style={styles.nameBlock}>
            <ThemedText
              style={[
                styles.productName,
                {
                  fontSize: getResponsiveFontSize(
                    Math.max(11, Math.min(14, screenWidth * 0.035))
                  ),
                  flexShrink: 1,
                  minWidth: 0,
                  maxWidth: isTablet ? 320 : 200,
                  color: isDarkMode ? "#fff" : "#000",
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling={false}
            >
              {product.name}
            </ThemedText>
          </View>
          <View style={styles.priceWrapper}>
            <ThemedText
              style={[
                styles.currentPrice,
                {
                  fontSize: getResponsiveFontSize(
                    Math.max(14, Math.min(18, screenWidth * 0.045))
                  ),
                },
              ]}
            >
              {(() => {
                const price = product.price;
                if (typeof price === "number" && !isNaN(price)) {
                  return `₦${price.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}`;
                }
                return `₦${String(price || 0)}`;
              })()}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }
);

ProductCard.displayName = "ProductCard";

const styles = StyleSheet.create({
  productCard: {
    borderRadius: 16,
    backgroundColor: "#23262F", // lighter dark for card
    padding: 0,
    overflow: "hidden",
    borderWidth: 0,
    elevation: 0,
    height: isTabletOrLarger() ? 340 : 270, // Increased height for better spacing
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#181A20",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#0A84FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  discountText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  productInfo: {
    padding: isTabletOrLarger() ? 16 : 12,
    minWidth: 0,
    flexShrink: 1,
    flex: 1,
    justifyContent: "space-between",
    position: "relative",
    paddingBottom: isTabletOrLarger() ? 50 : 36, // ensure space for price
  },
  nameBlock: {
    marginBottom: isTabletOrLarger() ? 8 : 0,
    minHeight: isTabletOrLarger() ? 25 : 20,
    flex: 1,
  },
  productName: {
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 17,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: isTabletOrLarger() ? 320 : 200,
  },
  currentPrice: {
    color: "#0A84FF",
    fontWeight: "bold",
    fontSize: 17,
  },
  heartIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 20,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.7)", // dark, semi-transparent
    alignItems: "center",
    justifyContent: "center",
  },
  priceWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 0,
    marginTop: isTabletOrLarger() ? 16 : 12,
    marginBottom: 0,
    minHeight: isTabletOrLarger() ? 28 : 24,
    position: "absolute",
    left: isTabletOrLarger() ? 16 : 12,
    right: isTabletOrLarger() ? 16 : 12,
    bottom: isTabletOrLarger() ? 16 : 12,
  },
});
