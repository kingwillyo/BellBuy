// app/product/[id].tsx (or app/detail/[id].tsx depending on your folder structure)

import { ReviewPreview } from "@/components/ReviewPreview";
import { ThemedText } from "@/components/ThemedText"; // Assuming your ThemedText component path
import { ThemedView } from "@/components/ThemedView"; // Assuming your ThemedView component path
import { AlertBottomSheet } from "@/components/ui/AlertBottomSheet";
import { BottomSheet, BottomSheetOption } from "@/components/ui/BottomSheet";
import { useAuth } from "@/hooks/useAuth";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useFollowStatus } from "@/hooks/useFollow";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWishlist } from "@/hooks/useWishlistProducts";
import { Ionicons } from "@expo/vector-icons"; // For icons like back, search, heart, etc.
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router"; // Import router for back navigation
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity, // <-- add Keyboard import
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useCart } from "../../context/CartContext";
import { handleNetworkError } from "../../lib/networkUtils";
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
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showBuyerProtectionModal, setShowBuyerProtectionModal] =
    useState(false);
  const { alertVisible, alertOptions, showAlert, hideAlert } = useBottomSheet();
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
  const iconBgColor = colorScheme === "dark" ? "rgba(0,0,0,0.7)" : "#fff";
  // const iconColor = useThemeColor({ light: "#000", dark: "#fff" }, "icon");

  // Check if product is already in cart
  const isInCart = cartItems.some((item) => item.product_id === id);

  // Bottom sheet options
  const bottomSheetOptions: BottomSheetOption[] = [
    {
      id: "report",
      title: "Report this item",
      subtitle: "Price gouging, prohibited item etc",
      icon: "flag-outline",
      onPress: () => {
        setShowBottomSheet(false);

        if (!user) {
          router.replace("/auth/signin");
          return;
        }

        // Navigate to report page with the product ID
        router.push({
          pathname: "/report-item",
          params: { productId: id },
        });
      },
      variant: "warning",
    },
    {
      id: "help",
      title: "How it works",
      subtitle: "Learn how to buy or sell on Rensa",
      icon: "book-outline",
      onPress: () => {
        setShowBottomSheet(false);
        router.push("/how-it-works");
      },
    },
    {
      id: "contact-support",
      title: "Contact support",
      subtitle: "Need help with this item?",
      icon: "help-circle-outline",
      onPress: () => {
        setShowBottomSheet(false);
        showAlert({
          title: "Contact Support",
          message: "This feature will be implemented soon.",
        });
      },
    },
  ];

  const handleWishlistToggle = async () => {
    if (!user) {
      router.replace("/auth/signin");
      return;
    }
    if (!product) return;

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

  const handleHandlingTimeInfoPress = () => {
    showAlert({
      title: "Handling Time",
      message:
        "How long the seller needs to prepare the order before it's ready for pickup or delivery. This includes packaging, quality checks, and preparation time.",
    });
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageIndicator, setShowImageIndicator] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const imageScrollRef = useRef<ScrollView>(null);
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
        handleNetworkError(err, {
          context: "loading product details",
          onRetry: fetchProduct,
        });
        setError(err.message || "Failed to load product");
      } finally {
        setLoadingProduct(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  const insets = useSafeAreaInsets();
  const statusBarBg = useThemeColor({}, "background");
  const statusBarStyle =
    colorScheme === "dark" ? "light-content" : "dark-content";

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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
        >
          {/* Skeleton Loader */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={1}
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
              paddingBottom:
                Platform.OS === "android" ? insets.bottom + 8 : insets.bottom,
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
      {Platform.OS === "android" && (
        <View
          style={{
            height: StatusBar.currentHeight,
            backgroundColor: statusBarBg,
          }}
        />
      )}
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBg}
        translucent
      />
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
      >
        {/* Header with Back Button and More Options */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerBack, { backgroundColor: iconBgColor }]}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>

          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={() => {
                showAlert({
                  title: "Share Item",
                  message: "This feature will be implemented soon.",
                });
              }}
              style={[styles.headerIcon, { backgroundColor: iconBgColor }]}
            >
              <Ionicons name="share-outline" size={24} color="#0A84FF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowBottomSheet(true)}
              style={[styles.headerIcon, { backgroundColor: iconBgColor }]}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#0A84FF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 0,
            paddingBottom:
              Platform.OS === "android" ? insets.bottom + 60 : insets.bottom,
          }}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={1}
          removeClippedSubviews={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Image Carousel */}
          <View style={styles.imageCarouselContainer}>
            <ScrollView
              ref={imageScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              onScroll={handleImageScroll}
              scrollEventThrottle={1}
              decelerationRate="fast"
              snapToInterval={width}
              snapToAlignment="start"
              disableIntervalMomentum={true}
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
                disabled={wishlistLoading}
              >
                {wishlistLoading ? (
                  <ActivityIndicator size="small" color="#0A84FF" />
                ) : (
                  <Ionicons
                    name={inWishlist ? "heart" : "heart-outline"}
                    size={24}
                    color="#0A84FF"
                  />
                )}
              </Pressable>
            </View>
            <View style={styles.ratingPriceRow}>
              <View style={styles.priceAndStockContainer}>
                <ThemedText style={[styles.productPrice, { color: "#0A84FF" }]}>
                  ₦{Math.round(product.price).toLocaleString()}
                </ThemedText>
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
            {/* Delivery Time */}
            {product.delivery_time && (
              <View style={styles.deliveryTimeSection}>
                <View style={styles.deliveryTimeRow}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#0A84FF"
                    style={{ marginRight: 8 }}
                  />
                  <ThemedText
                    style={[
                      styles.deliveryTimeText,
                      { color: textColor, flex: 1 },
                    ]}
                  >
                    Handling time: {product.delivery_time}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={handleHandlingTimeInfoPress}
                    style={styles.infoIconContainer}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                    accessibilityLabel="What is handling time?"
                    accessibilityHint="Tap to learn about handling time"
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#0A84FF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
                <View style={styles.sellerCard}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/seller/[id]",
                        params: { id: seller.id },
                      })
                    }
                    style={styles.sellerInfo}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={seller.avatar_url || fallbackImage}
                      style={[
                        styles.sellerAvatar,
                        { backgroundColor: borderColor },
                      ]}
                      contentFit="cover"
                      transition={300}
                      cachePolicy="memory-disk"
                    />
                    <View style={styles.sellerDetails}>
                      <ThemedText
                        style={[styles.sellerName, { color: textColor }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {seller.full_name}
                      </ThemedText>
                      <ThemedText
                        style={[styles.sellerEmail, { color: textColor }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {seller.email}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View style={styles.sellerActions}>
                    {/* Follow Button - Only show if not following */}
                    {!isFollowing && (
                      <TouchableOpacity
                        style={[
                          styles.circularButton,
                          {
                            backgroundColor:
                              colorScheme === "dark" ? "#2C2C2E" : "#F5F5F5",
                            borderColor:
                              colorScheme === "dark" ? "#3A3A3C" : "#E5E5E7",
                          },
                        ]}
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
                              text1: "Following",
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
                        {followLoading ? (
                          <ActivityIndicator size="small" color="#0A84FF" />
                        ) : (
                          <Ionicons name="add" size={20} color="#0A84FF" />
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Chat Button */}
                    <TouchableOpacity
                      style={[
                        styles.circularButton,
                        {
                          backgroundColor:
                            colorScheme === "dark" ? "#2C2C2E" : "#F5F5F5",
                          borderColor:
                            colorScheme === "dark" ? "#3A3A3C" : "#E5E5E7",
                        },
                      ]}
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
                        // Find existing conversation between user and seller by checking messages
                        console.log("Product ID from URL params:", id);
                        let conversationId = null;
                        const { data: existingMessages, error: convoError } =
                          await supabase
                            .from("messages")
                            .select("conversation_id")
                            .or(
                              `and(sender_id.eq.${user.id},receiver_id.eq.${seller.id}),and(sender_id.eq.${seller.id},receiver_id.eq.${user.id})`
                            )
                            .limit(1);
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
                        if (existingMessages && existingMessages.length > 0) {
                          console.log(
                            "Found existing conversation:",
                            existingMessages[0].conversation_id
                          );
                          conversationId = existingMessages[0].conversation_id;

                          // Update existing conversation with product_id
                          console.log(
                            "Updating existing conversation with product_id:",
                            id
                          );
                          const { error: updateError } = await supabase
                            .from("conversations")
                            .update({ product_id: id })
                            .eq("id", conversationId);

                          if (updateError) {
                            console.log(
                              "Error updating conversation:",
                              updateError
                            );
                          } else {
                            console.log(
                              "Successfully updated conversation with product_id"
                            );
                          }
                        } else {
                          // Create new conversation with product_id
                          console.log(
                            "Creating new conversation with product_id:",
                            id
                          );
                          const { data: newConvo, error: newConvoError } =
                            await supabase
                              .from("conversations")
                              .insert({ product_id: id })
                              .select()
                              .maybeSingle();
                          console.log("Conversation creation result:", {
                            newConvo,
                            newConvoError,
                          });
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
                        name="chatbubble-outline"
                        size={20}
                        color="#0A84FF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Buyer Protection Section */}
            <View style={{ marginTop: 18 }}>
              <ThemedText style={[styles.sectionHeader, { color: textColor }]}>
                Buyer Protection
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.buyerProtectionCard,
                  {
                    backgroundColor: cardBackgroundColor,
                    borderColor: borderColor,
                  },
                ]}
                onPress={() => setShowBuyerProtectionModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.buyerProtectionIcon}>
                  <Ionicons name="shield-checkmark" size={32} color="#0A84FF" />
                </View>
                <View style={styles.buyerProtectionContent}>
                  <ThemedText
                    style={[styles.buyerProtectionTitle, { color: textColor }]}
                  >
                    Buyer protection
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.buyerProtectionDescription,
                      { color: textColor },
                    ]}
                  >
                    Receive your item as described or your money back on all
                    orders
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.buyerProtectionLearnMore,
                      { color: "#0A84FF" },
                    ]}
                  >
                    Learn more
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

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
              paddingBottom:
                Platform.OS === "android" ? insets.bottom + 8 : insets.bottom,
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

      {/* Bottom Sheet */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="More options"
        options={bottomSheetOptions}
        enablePanDownToClose={true}
        enableBackdropToClose={true}
        showHandle={true}
      />

      {/* Alert Bottom Sheet */}
      {alertOptions && (
        <AlertBottomSheet
          visible={alertVisible}
          onClose={hideAlert}
          title={alertOptions.title}
          message={alertOptions.message}
          buttonText={alertOptions.buttonText}
          onPress={alertOptions.onPress}
          variant={alertOptions.variant}
        />
      )}

      {/* Buyer Protection Modal */}
      <BottomSheet
        visible={showBuyerProtectionModal}
        onClose={() => setShowBuyerProtectionModal(false)}
        title="Buyer Protection"
        options={[
          {
            id: "description",
            title: "What is Buyer Protection?",
            subtitle:
              "Buyer Protection ensures a safe and secure shopping experience for you on BellBuy. We provide protection for all your purchases to give you peace of mind.\n\nHow it works:",
            icon: "information-circle-outline",
            onPress: () => {},
            variant: "default",
          },
          {
            id: "secure-transactions",
            title: "Secure transactions",
            subtitle:
              "Your money is held securely throughout the entire transaction. We won't release it to the seller until you receive your item and give them the order confirmation code. Payments are safe and done by our payment partner.",
            icon: "shield-checkmark-outline",
            onPress: () => {},
            variant: "default",
          },
          {
            id: "refund-costs",
            title: "Refund costs",
            subtitle:
              "You can receive a refund if the seller does not confirm your order on time or rejects it.",
            icon: "refresh-outline",
            onPress: () => {},
            variant: "default",
          },
        ]}
        enablePanDownToClose={true}
        enableBackdropToClose={true}
        showHandle={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerIcon: {
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
  deliveryTimeSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  deliveryTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryTimeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoIconContainer: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 26,
    minHeight: 26,
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
    justifyContent: "space-between",
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
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  buyerProtectionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  buyerProtectionIcon: {
    marginRight: 16,
  },
  buyerProtectionContent: {
    flex: 1,
  },
  buyerProtectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  buyerProtectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  buyerProtectionLearnMore: {
    fontSize: 14,
    fontWeight: "600",
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
    minWidth: 0, // Allows flex to shrink below content size
    marginRight: 8, // Add some margin from action buttons
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    flexShrink: 1, // Allows text to shrink
  },
  sellerEmail: {
    fontSize: 13,
    opacity: 0.7,
    flexShrink: 1, // Allows text to shrink
  },
  sellerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0, // Prevents action buttons from shrinking
  },
  circularButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
