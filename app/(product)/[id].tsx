// app/product/[id].tsx (or app/detail/[id].tsx depending on your folder structure)

import { ReviewPreview } from "@/components/ReviewPreview";
import { ThemedText } from "@/components/ThemedText"; // Assuming your ThemedText component path
import { ThemedView } from "@/components/ThemedView"; // Assuming your ThemedView component path
import { useAuth } from "@/hooks/useAuth";
import { useFollowStatus } from "@/hooks/useFollow";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWishlist } from "@/hooks/useWishlistProducts";
import { Ionicons } from "@expo/vector-icons"; // For icons like back, search, heart, etc.
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router"; // Import router for back navigation
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";

const { width } = Dimensions.get("window"); // Get screen width for image sizing

export default function ProductDetailPage() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const { addToCart, loading: cartLoading, cartItems } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const inWishlist = isInWishlist(product?.id);
  const {
    reviews,
    averageRating,
    totalCount,
    loading: reviewsLoading,
  } = useProductReviews(id!);

  // Theme-aware colors
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000000" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E0E0E0", dark: "#333" },
    "background"
  );
  // const iconColor = useThemeColor({ light: "#000", dark: "#fff" }, "icon");

  // Check if product is already in cart
  const isInCart = cartItems.some((item) => item.product_id === id);

  const handleWishlistToggle = () => {
    if (!user) {
      router.replace("/auth/signin");
      return;
    }
    if (!product) return;
    if (inWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageIndicator, setShowImageIndicator] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const hideTimer = useRef<any>(null);

  const handleImageScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentImageIndex(index);
    setShowImageIndicator(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowImageIndicator(false), 1000);
  };
  useEffect(() => {
    setShowImageIndicator(true); // Show on mount
    // Hide after 2s if user does not scroll
    hideTimer.current = setTimeout(() => setShowImageIndicator(false), 4000);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoadingProduct(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        setProduct(data);
        if (data?.user_id) {
          const { data: sellerData, error: sellerError } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .eq("id", data.user_id)
            .maybeSingle();
          if (!sellerError) setSeller(sellerData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load product");
      } finally {
        setLoadingProduct(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  const insets = useSafeAreaInsets();

  // Follow status for seller
  const {
    isFollowing,
    loading: followLoading,
    toggle: toggleFollow,
    canQuery: canFollowQuery,
  } = useFollowStatus(seller?.id);

  const images =
    product?.image_urls && product.image_urls.length > 0
      ? product.image_urls
      : [product?.main_image || fallbackImage];

  // If loading, show a skeleton loader instead of an empty product detail structure
  if (loadingProduct) {
    // Use palette-matching skeleton color
    const skeletonColor = isDarkMode ? "#151718" : "#e8e9eb";
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Skeleton Loader */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
          >
            <View style={styles.imageCarouselContainer}>
              <View
                style={[
                  styles.productMainImage,
                  { backgroundColor: skeletonColor },
                ]}
              />
            </View>
            <ThemedView
              style={[
                styles.detailsContainer,
                { backgroundColor: cardBackgroundColor },
              ]}
            >
              <View style={styles.namePriceRow}>
                <View
                  style={{
                    flex: 1,
                    height: 28,
                    backgroundColor: skeletonColor,
                    borderRadius: 6,
                    marginRight: 10,
                  }}
                />
                {/* Heart icon should be visible, not a skeleton */}
                <Pressable style={styles.favoriteButton}>
                  <Ionicons name="heart-outline" size={24} color="#0A84FF" />
                </Pressable>
              </View>
              <View style={styles.ratingPriceRow}>
                <View
                  style={{
                    width: 80,
                    height: 22,
                    backgroundColor: skeletonColor,
                    borderRadius: 6,
                  }}
                />
              </View>
              <View
                style={{
                  height: 60,
                  backgroundColor: skeletonColor,
                  borderRadius: 6,
                  marginTop: 12,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 18,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: skeletonColor,
                    marginRight: 12,
                  }}
                />
                <View>
                  <View
                    style={{
                      width: 100,
                      height: 16,
                      backgroundColor: skeletonColor,
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  />
                  <View
                    style={{
                      width: 140,
                      height: 14,
                      backgroundColor: skeletonColor,
                      borderRadius: 6,
                    }}
                  />
                </View>
              </View>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
        <View
          style={[
            styles.bottomButtons,
            {
              backgroundColor: cardBackgroundColor,
              borderTopColor: borderColor,
            },
          ]}
        >
          {/* Add to Cart button skeleton, using TouchableOpacity for exact match */}
          <TouchableOpacity
            style={[styles.addToCartButton, { backgroundColor: "#0A84FF" }]}
            disabled={true}
            activeOpacity={1}
          >
            <ThemedText
              style={[
                styles.addToCartButtonText,
                { color: "#FFF", opacity: 0.9 },
              ]}
            >
              Add to Cart
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (error || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        <ThemedView
          style={[
            styles.container,
            {
              backgroundColor,
              justifyContent: "center",
              alignItems: "center",
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <ThemedText type="title">{error || "Product Not Found"}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const handleAddToCart = async () => {
    if (!user) {
      router.replace("/auth/signin");
      return;
    }
    if (!product?.id) return;

    // Check if product is in stock
    if (!product.in_stock || product.stock_quantity <= 0) {
      Toast.show({
        type: "error",
        text1: "Out of Stock",
        text2: "This product is currently unavailable",
        visibilityTime: 2000,
        position: "top",
        topOffset: 60,
        props: {},
      });
      return;
    }

    // If product is already in cart, navigate to cart
    if (isInCart) {
      router.push("/(tabs)/cart");
      return;
    }

    // Otherwise add to cart
    await addToCart(product.id);
    Toast.show({
      type: "success",
      text1: "Added to cart",
      visibilityTime: 1800,
      position: "top",
      topOffset: 60,
      props: {},
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom: insets.bottom,
          }}
          ref={scrollRef}
        >
          {/* Image Carousel */}
          <View style={styles.imageCarouselContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              onScroll={handleImageScroll}
              scrollEventThrottle={16}
            >
              {images.map((img: string, idx: number) => (
                <Image
                  key={img + idx}
                  source={img || fallbackImage}
                  style={styles.productMainImage}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                />
              ))}
            </ScrollView>
            {/* Image Indicator Dots (overlay bottom of image carousel, auto-hide) */}
            {showImageIndicator && (
              <View style={styles.imageIndicatorContainer}>
                {images.map((img: string, idx: number) => (
                  <View
                    key={idx}
                    style={[
                      styles.imageIndicatorDot,
                      currentImageIndex === idx &&
                        styles.imageIndicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
          {/* All other content below the indicator */}
          <ThemedView
            style={[
              styles.detailsContainer,
              { backgroundColor: cardBackgroundColor },
            ]}
          >
            <View style={styles.namePriceRow}>
              <ThemedText
                type="title"
                style={[styles.productTitle, { color: textColor }]}
              >
                {product.name}
              </ThemedText>
              <Pressable
                style={styles.favoriteButton}
                onPress={handleWishlistToggle}
              >
                <Ionicons
                  name={inWishlist ? "heart" : "heart-outline"}
                  size={24}
                  color="#0A84FF"
                />
              </Pressable>
            </View>
            <View style={styles.ratingPriceRow}>
              <View style={styles.priceAndStockContainer}>
                {product.is_super_flash_sale && product.super_flash_price ? (
                  <View style={styles.priceContainer}>
                    <ThemedText
                      style={[styles.originalPrice, { color: textColor }]}
                    >
                      ₦{Math.round(product.price).toLocaleString()}
                    </ThemedText>
                    <ThemedText
                      style={[styles.superFlashPrice, { color: "#0A84FF" }]}
                    >
                      ₦{Math.round(product.super_flash_price).toLocaleString()}
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText
                    style={[styles.productPrice, { color: "#0A84FF" }]}
                  >
                    ₦{Math.round(product.price).toLocaleString()}
                  </ThemedText>
                )}
                {/* Stock Quantity */}
                {product.stock_quantity !== undefined &&
                  product.stock_quantity !== null && (
                    <ThemedText
                      style={[
                        styles.stockLabel,
                        {
                          color:
                            product.in_stock && product.stock_quantity > 0
                              ? textColor
                              : "#FF3B30",
                        },
                      ]}
                    >
                      {product.in_stock && product.stock_quantity > 0
                        ? `${product.stock_quantity} in stock`
                        : "Out of stock"}
                    </ThemedText>
                  )}
              </View>
            </View>
            {/* Description */}
            {product.description && (
              <>
                <ThemedText
                  style={[styles.sectionHeader, { color: textColor }]}
                >
                  Product Description
                </ThemedText>
                <ThemedText
                  style={{ color: textColor, marginTop: 4, fontSize: 15 }}
                >
                  {product.description}
                </ThemedText>
              </>
            )}
            {/* Seller Info */}
            {seller && (
              <View style={{ marginTop: 18 }}>
                <ThemedText
                  style={[styles.sectionHeader, { color: textColor }]}
                >
                  Seller
                </ThemedText>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/seller/[id]",
                      params: { id: seller.id },
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={seller.avatar_url || fallbackImage}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      marginRight: 12,
                      backgroundColor: borderColor,
                    }}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                  />
                  <View>
                    <ThemedText
                      style={{ color: textColor, fontWeight: "bold" }}
                    >
                      {seller.full_name}
                    </ThemedText>
                    <ThemedText style={{ color: textColor, fontSize: 13 }}>
                      {seller.email}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 18 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor:
                        colorScheme === "dark" ? "#222C3A" : "#F5F8FF",
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      marginTop: 0,
                    }}
                    onPress={async () => {
                      if (!user) {
                        router.replace("/auth/signin");
                        return;
                      }
                      // Prevent chatting with self
                      if (seller?.id && user.id === seller.id) {
                        Toast.show({
                          type: "info",
                          text1: "You cannot chat with yourself",
                          visibilityTime: 1600,
                          position: "top",
                          topOffset: 60,
                          props: {},
                        });
                        return;
                      }
                      // Find existing conversation between user and seller
                      let conversationId = null;
                      const { data: existingConvos, error: convoError } =
                        await supabase
                          .from("conversation_participants")
                          .select("conversation_id")
                          .eq("user_id", user.id);
                      if (convoError) {
                        Toast.show({
                          type: "error",
                          text1: "Unable to check chat",
                          visibilityTime: 1800,
                          position: "top",
                          topOffset: 60,
                          props: {},
                        });
                        return;
                      }
                      // Find a conversation where both user and seller are participants
                      let foundConvo = null;
                      if (existingConvos && existingConvos.length > 0) {
                        for (const convo of existingConvos) {
                          const { data: sellerInConvo } = await supabase
                            .from("conversation_participants")
                            .select("id")
                            .eq("conversation_id", convo.conversation_id)
                            .eq("user_id", seller.id)
                            .maybeSingle();
                          if (sellerInConvo) {
                            foundConvo = convo.conversation_id;
                            break;
                          }
                        }
                      }
                      if (foundConvo) {
                        conversationId = foundConvo;
                      } else {
                        // Create new conversation and add both participants
                        const { data: newConvo, error: newConvoError } =
                          await supabase
                            .from("conversations")
                            .insert({})
                            .select()
                            .maybeSingle();
                        if (newConvoError || !newConvo) {
                          Toast.show({
                            type: "error",
                            text1: "Unable to start chat",
                            visibilityTime: 1800,
                            position: "top",
                            topOffset: 60,
                            props: {},
                          });
                          return;
                        }
                        conversationId = newConvo.id;
                        // Add both participants
                        await supabase
                          .from("conversation_participants")
                          .insert([
                            {
                              conversation_id: conversationId,
                              user_id: user.id,
                            },
                            {
                              conversation_id: conversationId,
                              user_id: seller.id,
                            },
                          ]);
                      }
                      if (conversationId) {
                        router.push({
                          pathname: "/chat/ChatScreen",
                          params: { conversationId, receiver_id: seller.id },
                        });
                      } else {
                        Toast.show({
                          type: "error",
                          text1: "Unable to open chat",
                          visibilityTime: 1800,
                          position: "top",
                          topOffset: 60,
                          props: {},
                        });
                      }
                    }}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={20}
                      color={colorScheme === "dark" ? "#0A84FF" : "#0A84FF"}
                      style={{ marginRight: 8 }}
                    />
                    <ThemedText
                      style={{
                        color: colorScheme === "dark" ? "#0A84FF" : "#0A84FF",
                        fontWeight: "600",
                        fontSize: 15,
                      }}
                    >
                      Chat Seller
                    </ThemedText>
                  </TouchableOpacity>
                  {seller && (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                          colorScheme === "dark" ? "#222C3A" : "#F5F8FF",
                        borderRadius: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        marginTop: 0,
                      }}
                      disabled={
                        followLoading ||
                        (!!user && !!seller && user.id === seller.id)
                      }
                      onPress={async () => {
                        if (!user) {
                          router.replace("/auth/signin");
                          return;
                        }
                        if (user.id === seller.id) {
                          Toast.show({
                            type: "info",
                            text1: "You cannot follow yourself",
                            visibilityTime: 1600,
                            position: "top",
                            topOffset: 60,
                            props: {},
                          });
                          return;
                        }
                        try {
                          await toggleFollow();
                          Toast.show({
                            type: "success",
                            text1: isFollowing ? "Unfollowed" : "Following",
                            visibilityTime: 1200,
                            position: "top",
                            topOffset: 60,
                          });
                        } catch (e: any) {
                          Toast.show({
                            type: "error",
                            text1: e?.message || "Action failed",
                            visibilityTime: 1600,
                            position: "top",
                            topOffset: 60,
                          });
                        }
                      }}
                    >
                      <Ionicons
                        name={
                          isFollowing
                            ? "person-remove-outline"
                            : "person-add-outline"
                        }
                        size={20}
                        color={"#0A84FF"}
                        style={{ marginRight: 8 }}
                      />
                      <ThemedText
                        style={{
                          color: "#0A84FF",
                          fontWeight: "600",
                          fontSize: 15,
                        }}
                      >
                        {followLoading
                          ? "Please wait..."
                          : isFollowing
                            ? "Unfollow"
                            : "Follow Seller"}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Reviews Section */}
            <ReviewPreview
              reviews={reviews}
              averageRating={averageRating}
              totalCount={totalCount}
              onSeeAll={() => router.push(`/product/${id}/reviews`)}
            />
          </ThemedView>
          {/* Add to Cart Button */}
        </ScrollView>
        <View
          style={[
            styles.bottomButtons,
            {
              backgroundColor: cardBackgroundColor,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              {
                backgroundColor:
                  !product?.in_stock || product?.stock_quantity <= 0
                    ? "#999"
                    : "#0A84FF",
              },
            ]}
            onPress={handleAddToCart}
            disabled={
              cartLoading ||
              !product?.id ||
              !product?.in_stock ||
              product?.stock_quantity <= 0
            }
          >
            <ThemedText style={[styles.addToCartButtonText, { color: "#FFF" }]}>
              {cartLoading
                ? "Adding..."
                : !product?.in_stock || product?.stock_quantity <= 0
                  ? "Out of Stock"
                  : isInCart
                    ? "See in cart"
                    : "Add to Cart"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerIcon: {
    padding: 5,
  },
  headerRightIcons: {
    flexDirection: "row",
    gap: 10,
    marginRight: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
    textAlign: "left",
  },
  imageCarouselContainer: {
    width: width,
    height: width * 0.9,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  productMainImage: {
    width: width,
    height: "100%",
  },
  detailsContainer: {
    padding: 16,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    minHeight: 200,
  },
  namePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
  },
  favoriteButton: {
    padding: 8,
  },
  ratingPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  priceAndStockContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0A84FF",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  superFlashPrice: {
    fontSize: 20,
    fontWeight: "bold",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
  },
  addToCartButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  buyNowButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  buyNowButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  stockLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  imageIndicatorContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginHorizontal: 4,
    opacity: 0.5,
  },
  imageIndicatorDotActive: {
    backgroundColor: "#0A84FF",
    opacity: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "transparent",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBack: {
    padding: 5,
  },
});
