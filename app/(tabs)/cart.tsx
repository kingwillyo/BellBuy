/* eslint-disable @typescript-eslint/no-unused-vars */
import CartItem from "@/components/CartItem";
import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useCart } from "../../context/CartContext";

const { width } = Dimensions.get("window");

export default function CartScreen() {
  const { user, isLoading } = useAuth();
  const {
    cartItems,
    removeFromCart,
    addToCart,
    updateQuantity,
    loading,
    error,
    refreshCart,
    updateQuantityByProductId, // <-- add this
  } = useCart();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const backgroundColor = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBackgroundColor = isDarkMode ? "#151718" : "#fff";
  const borderColor = isDarkMode ? "#333" : "#EEE";

  // Calculate subtotal using super flash sale prices if available
  const subtotal = cartItems.reduce((sum, item) => {
    const price =
      item.product?.is_super_flash_sale && item.product?.super_flash_price
        ? item.product.super_flash_price
        : item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const platformFee = cartItems.length > 0 ? 100.0 : 0;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = subtotal + platformFee;

  // Handlers for CartItem component
  const handleQuantityChange = (cart_item_id: string, delta: number) => {
    const item = cartItems.find((i) => i.id === cart_item_id);
    if (!item) return;
    const newQty = item.quantity + delta;
    updateQuantity(cart_item_id, newQty);
  };

  // Handler to delete item by productId
  const handleDeleteItem = (productId: string) => {
    const item = cartItems.find((i) => i.product.id === productId);
    if (!item) return;
    removeFromCart(item.id);
  };

  // Handler to increase quantity by productId
  const increaseQuantity = (productId: string) => {
    const item = cartItems.find((i) => i.product.id === productId);
    if (!item || !updateQuantityByProductId) return;
    updateQuantityByProductId(productId, item.quantity + 1);
  };

  // Handler to decrease quantity by productId
  const decreaseQuantity = (productId: string) => {
    const item = cartItems.find((i) => i.product.id === productId);
    if (!item || !updateQuantityByProductId) return;
    updateQuantityByProductId(productId, item.quantity - 1);
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshCart();
    }, [refreshCart])
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);
  if (!isLoading && !user) {
    return null;
  }

  // Sort cartItems by newest item first (assuming id increases over time, or use created_at if available)
  const sortedCartItems = [...cartItems].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Your Cart" />
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 16 }}>
            {/* Skeleton for 3 cart items */}
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  marginBottom: 10,
                  backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                  padding: 10,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 0,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1, justifyContent: "space-between" }}>
                  <View
                    style={{
                      width: "60%",
                      height: 16,
                      backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                      marginBottom: 8,
                      borderRadius: 4,
                    }}
                  />
                  <View
                    style={{
                      width: "40%",
                      height: 14,
                      backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                      borderRadius: 4,
                    }}
                  />
                  <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                        borderRadius: 5,
                        marginRight: 8,
                      }}
                    />
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                        borderRadius: 5,
                        marginRight: 8,
                      }}
                    />
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                        borderRadius: 5,
                      }}
                    />
                  </View>
                </View>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 12,
                    marginLeft: 10,
                  }}
                />
              </View>
            ))}
            {/* Skeleton for summary */}
            <View
              style={[
                styles.summaryContainer,
                {
                  backgroundColor: cardBackgroundColor,
                  marginTop: 24,
                  borderRadius: 0,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <View
                  style={{
                    width: 100,
                    height: 16,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
                <View
                  style={{
                    width: 60,
                    height: 16,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
              </View>
              <View style={styles.summaryRow}>
                <View
                  style={{
                    width: 100,
                    height: 16,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
                <View
                  style={{
                    width: 60,
                    height: 16,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
              </View>
              <View
                style={[styles.divider, { backgroundColor: borderColor }]}
              />
              <View style={styles.summaryRow}>
                <View
                  style={{
                    width: 100,
                    height: 18,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
                <View
                  style={{
                    width: 80,
                    height: 18,
                    backgroundColor: isDarkMode ? "#151718" : "#e8e9eb",
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          </View>
        ) : error ? (
          <ThemedText style={[styles.emptyCartText, { color: "#FF3B30" }]}>
            {error}
          </ThemedText>
        ) : cartItems.length === 0 ? (
          <ThemedText style={[styles.emptyCartText, { color: textColor }]}>
            You don&apos;t have any items in your cart.
          </ThemedText>
        ) : (
          <>
            {/* Super Flash Sale Savings */}
            {(() => {
              const totalSavings = cartItems.reduce((savings, item) => {
                if (
                  item.product?.is_super_flash_sale &&
                  item.product?.super_flash_price
                ) {
                  return (
                    savings +
                    (item.product.price - item.product.super_flash_price) *
                      item.quantity
                  );
                }
                return savings;
              }, 0);

              if (totalSavings > 0) {
                return (
                  <View
                    style={[
                      styles.savingsCard,
                      { backgroundColor: cardBackgroundColor },
                    ]}
                  >
                    <ThemedText
                      style={[styles.savingsText, { color: "#FF3B30" }]}
                    >
                      🔥 You saved ₦{Math.round(totalSavings).toLocaleString()}{" "}
                      with Super Flash Sale!
                    </ThemedText>
                  </View>
                );
              }
              return null;
            })()}
            <FlatList
              data={sortedCartItems}
              keyExtractor={(item) => item.product.id}
              contentContainerStyle={{ paddingBottom: 220 }}
              renderItem={({ item }) => (
                <CartItem
                  item={{
                    id: item.id,
                    name: item.product?.name || "",
                    price:
                      item.product?.is_super_flash_sale &&
                      item.product?.super_flash_price
                        ? item.product.super_flash_price
                        : item.product?.price || 0,
                    imageUrl: item.product?.main_image || "",
                    quantity: item.quantity,
                    productId: item.product.id,
                    isSuperFlashSale:
                      item.product?.is_super_flash_sale || false,
                    originalPrice: item.product?.price || 0,
                    stock_quantity: item.product?.stock_quantity,
                    in_stock: item.product?.in_stock,
                  }}
                  increaseQuantity={increaseQuantity}
                  decreaseQuantity={decreaseQuantity}
                  onDeleteItem={handleDeleteItem}
                />
              )}
            />
          </>
        )}
      </View>

      {/* Order Summary + Checkout Button - fixed at bottom */}
      <View
        style={{
          width: "100%",
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <View
          style={[
            styles.summaryContainer,
            { backgroundColor: cardBackgroundColor, marginBottom: 72 },
          ]}
        >
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
              Items ({totalItems})
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: textColor }]}>
              ₦{Math.round(subtotal).toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.summaryLabel, { color: textColor }]}>
              Platform Fee
            </ThemedText>
            <ThemedText style={[styles.summaryValue, { color: textColor }]}>
              ₦{Math.round(platformFee).toLocaleString()}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.summaryRow}>
            <ThemedText style={[styles.totalPriceLabel, { color: textColor }]}>
              Total Price
            </ThemedText>
            <ThemedText style={[styles.totalPriceValue, { color: textColor }]}>
              ₦{Math.round(totalAmount).toLocaleString()}
            </ThemedText>
          </View>
        </View>
        <View
          style={[
            styles.bottomCheckoutButtonContainer,
            {
              backgroundColor: cardBackgroundColor,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => {
              if (cartItems.length > 0) {
                console.log(
                  "[Cart] Checkout button pressed, navigating to /checkout"
                );
                router.push("/checkout");
              }
            }}
            disabled={cartItems.length === 0}
          >
            <ThemedText style={styles.checkoutButtonText}>
              {cartItems.length === 0
                ? "Checkout"
                : loading
                  ? "Processing..."
                  : "Checkout"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // Remove extra top padding
    paddingHorizontal: 0,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
  },
  emptyCartText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#666",
  },
  summaryContainer: {
    marginTop: 24,
    borderRadius: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#888",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginBottom: 8,
    marginHorizontal: 0,
  },
  totalPriceLabel: {
    fontSize: 17,
    fontWeight: "bold",
  },
  totalPriceValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0A84FF",
  },
  bottomCheckoutButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  checkoutButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
  },
  savingsCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
