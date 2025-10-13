import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { VerificationCodeInput } from "@/components/VerificationCodeInput";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { fetchWithRetry, handleNetworkError } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Order {
  id: number;
  status: string;
  product_id: string;
  quantity: number;
  total_amount?: number;
  shipping_fee?: number;
  platform_fee?: number;
  created_at?: string;
  delivery_method?: string;
  delivery_address?: string;
  user_id?: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
  products?: any[]; // Added for multiple products
  product_items: { product_id: string; quantity: number }[]; // New structure for order items
}

interface Product {
  id: string;
  name: string;
  main_image?: string;
}

export const options = { headerShown: false };

export default function SellerOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<{ [id: string]: Product }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<{ [id: number]: boolean }>({});
  const [expandedOrders, setExpandedOrders] = useState<{
    [id: number]: boolean;
  }>({});

  const router = useRouter();
  const headerBackgroundColor = useThemeColor(
    { light: Colors.light.background, dark: Colors.dark.background },
    "background"
  );
  const textColor = useThemeColor(
    { light: Colors.light.text, dark: Colors.dark.text },
    "text"
  );
  const textSecondaryColor = useThemeColor(
    { light: Colors.light.textSecondary, dark: Colors.dark.textSecondary },
    "text"
  );
  const idColor = Colors.light.tint;
  const cardBackgroundColor = useThemeColor(
    { light: Colors.light.cardBackground, dark: Colors.dark.cardBackground },
    "background"
  );
  const borderColor = useThemeColor(
    { light: Colors.light.borderColor, dark: Colors.dark.borderColor },
    "background"
  );
  const dividerColor = useThemeColor(
    { light: Colors.light.divider, dark: Colors.dark.divider },
    "background"
  );

  const EDGE_FUNCTION_URL =
    "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order";

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Fetch orders and related products
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    let subscription: any = null;
    const fetchOrders = async () => {
      // Explicitly filter by seller_id to show only orders where current user is the seller
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles!user_id (
            id,
            full_name,
            avatar_url,
            email
          )
        `
        )
        .eq("seller_id", user.id) // Explicitly filter by seller_id
        .order("created_at", { ascending: false });
      if (orderError) {
        setError(orderError.message);
        setOrders([]);
        setLoading(false);
        return;
      }
      // For each order, fetch its order_items
      const orderIds = (orderData || []).map((o) => o.id);
      let allOrderItems: any[] = [];
      if (orderIds.length > 0) {
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity")
          .in("order_id", orderIds);
        if (orderItemsError) {
          console.error("[SellerOrders] Order items error:", orderItemsError);
        } else if (orderItemsData) {
          allOrderItems = orderItemsData;
        }
      }
      // Map orderId -> array of productIds with quantities
      const orderIdToProductItems: {
        [orderId: number]: { product_id: string; quantity: number }[];
      } = {};
      allOrderItems.forEach((item) => {
        if (!orderIdToProductItems[item.order_id])
          orderIdToProductItems[item.order_id] = [];
        orderIdToProductItems[item.order_id].push({
          product_id: item.product_id,
          quantity: item.quantity,
        });
      });
      // Collect all unique product IDs
      const uniqueProductIds = Array.from(
        new Set(allOrderItems.map((item) => item.product_id))
      );
      // Fetch product details
      let productMap: { [id: string]: Product } = {};
      if (uniqueProductIds.length > 0) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, name, main_image")
          .in("id", uniqueProductIds);
        if (productError) {
          console.error("[SellerOrders] Product fetch error:", productError);
        } else if (productData) {
          for (const p of productData) productMap[p.id] = p;
        }
      }
      // Attach productItems to each order
      const ordersWithProducts = (orderData || []).map((order) => ({
        ...order,
        product_items: orderIdToProductItems[order.id] || [],
      }));
      setOrders(ordersWithProducts);
      setProducts(productMap);
      setLoading(false);
    };
    fetchOrders();
    // Subscribe to realtime updates for this seller's orders
    subscription = supabase
      .channel("orders-seller-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          // Refetch orders on any insert/update/delete for this seller
          fetchOrders();
        }
      )
      .subscribe();
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user]);

  const handleUpdateStatus = async (orderId: number, status: string) => {
    setUpdating((prev) => ({ ...prev, [orderId]: true }));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetchWithRetry(
        EDGE_FUNCTION_URL,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ order_id: orderId, status }),
        },
        {
          maxRetries: 2,
          timeout: 10000,
          context: "updating order status",
        }
      );

      // Refresh orders
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (e: any) {
      handleNetworkError(e, {
        context: "updating order status",
        onRetry: () => handleUpdateStatus(orderId, status),
      });
      setError(e.message || "Failed to update order status");
    } finally {
      setUpdating((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleConfirmOrder = async (order: Order) => {
    // Check if order has shipping fee (shipping_fee > 0)
    if (order.shipping_fee && order.shipping_fee > 0) {
      // Navigate to pickup confirmation screen
      router.push({
        pathname: "/account/pickup-confirmation",
        params: { orderId: order.id.toString() },
      });
    } else {
      // No shipping fee, confirm directly
      await handleUpdateStatus(order.id, "confirmed");
    }
  };

  const handleChatWithBuyer = async (buyerId: string, order?: Order) => {
    try {
      // Find existing conversation between user and buyer by checking messages
      let conversationId = null;
      const { data: existingMessages, error: convoError } = await supabase
        .from("messages")
        .select("conversation_id")
        .or(
          `and(sender_id.eq.${buyerId},receiver_id.eq.${user?.id}),and(sender_id.eq.${user?.id},receiver_id.eq.${buyerId})`
        )
        .limit(1);

      if (convoError) {
        console.error("Error checking conversations:", convoError);
        return;
      }

      if (existingMessages && existingMessages.length > 0) {
        console.log(
          "Found existing conversation:",
          existingMessages[0].conversation_id
        );
        conversationId = existingMessages[0].conversation_id;

        // Update existing conversation with product_id from order items
        const productId =
          order?.product_items?.[0]?.product_id || order?.product_id || null;
        if (productId) {
          console.log(
            "Updating existing conversation with product_id from seller order:",
            productId
          );
          const { error: updateError } = await supabase
            .from("conversations")
            .update({ product_id: productId })
            .eq("id", conversationId);

          if (updateError) {
            console.log("Error updating conversation:", updateError);
          } else {
            console.log("Successfully updated conversation with product_id");
          }
        }
      } else {
        // Create new conversation with product_id from order items
        const productId =
          order?.product_items?.[0]?.product_id || order?.product_id || null;
        console.log("Creating seller conversation with product_id:", productId);
        const { data: newConvo, error: newConvoError } = await supabase
          .from("conversations")
          .insert({ product_id: productId })
          .select()
          .maybeSingle();
        console.log("Seller conversation creation result:", {
          newConvo,
          newConvoError,
        });

        if (newConvoError || !newConvo) {
          console.error("Error creating conversation:", newConvoError);
          return;
        }

        conversationId = newConvo.id;
      }

      // Navigate to conversation
      router.push({
        pathname: "/chat/ChatScreen" as any,
        params: {
          conversationId: conversationId,
          receiver_id: buyerId,
        },
      });
    } catch (error) {
      console.error("Error creating/accessing conversation:", error);
      handleNetworkError(error, {
        context: "accessing chat",
        onRetry: () => handleChatWithBuyer(buyerId),
      });
    }
  };

  const toggleOrderExpanded = (orderId: number) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Restore the renderItem function for FlatList
  const renderItem = ({
    item,
  }: {
    item: Order & { product_items: { product_id: string; quantity: number }[] };
  }) => {
    // Build productsArray from product_ids with more details
    const productsArray = (item.product_items || []).map((item) => ({
      product_id: item.product_id,
      name:
        products[item.product_id]?.name || "Product has been deleted by seller",
      main_image: products[item.product_id]?.main_image,
      quantity: item.quantity,
      isDeleted: !products[item.product_id],
    }));

    // If no products, fallback to single product_id
    if (!productsArray.length && item.product_id) {
      productsArray.push({
        product_id: item.product_id,
        name:
          products[item.product_id]?.name ||
          "Product has been deleted by seller",
        main_image: products[item.product_id]?.main_image,
        quantity: item.quantity || 1,
        isDeleted: !products[item.product_id],
      });
    }

    const isExpanded = expandedOrders[item.id] || false;
    const isCompleted =
      item.status === "confirmed" || item.status === "rejected";

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: cardBackgroundColor,
            borderColor: borderColor,
            ...Shadows.md,
          },
        ]}
        onPress={() => toggleOrderExpanded(item.id)}
        activeOpacity={0.7}
      >
        {/* Product Images and Names - only show if pending or expanded */}
        {(item.status === "pending" || isExpanded) && (
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="cube-outline"
                size={18}
                color={idColor}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Products Ordered
              </Text>
            </View>
            <View style={styles.productsGrid}>
              {productsArray.map((prod, idx) => (
                <View
                  key={prod.product_id || idx}
                  style={[styles.productItem, { borderColor: borderColor }]}
                >
                  {prod.main_image && !prod.isDeleted ? (
                    <Image
                      source={{ uri: prod.main_image }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.productImage,
                        {
                          backgroundColor: prod.isDeleted
                            ? textSecondaryColor
                            : borderColor,
                          alignItems: "center",
                          justifyContent: "center",
                        },
                      ]}
                    >
                      {prod.isDeleted && (
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={textSecondaryColor}
                        />
                      )}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.productName,
                      {
                        color: prod.isDeleted ? textSecondaryColor : textColor,
                        textAlign: "center",
                        marginTop: Spacing.sm,
                        fontStyle: prod.isDeleted ? "italic" : "normal",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {prod.name || "Product"}
                  </Text>
                  <View style={styles.quantityBadge}>
                    <Text style={[styles.productQuantity, { color: "#fff" }]}>
                      {prod.quantity}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={idColor}
                style={{ marginRight: Spacing.xs }}
              />
              <Text style={[styles.orderId, { color: idColor }]}>
                Order #{item.id}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === "pending"
                      ? Colors.light.warning + "20"
                      : item.status === "confirmed"
                      ? Colors.light.success + "20"
                      : item.status === "rejected"
                      ? Colors.light.error + "20"
                      : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusValue,
                  {
                    color:
                      item.status === "pending"
                        ? Colors.light.warning
                        : item.status === "confirmed"
                        ? Colors.light.success
                        : item.status === "rejected"
                        ? Colors.light.error
                        : textColor,
                  },
                ]}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.orderInfo}>
            {item.total_amount !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={textSecondaryColor}
                  style={{ marginRight: Spacing.sm }}
                />
                <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                  Total:
                </Text>
                <Text style={[styles.totalAmount, { color: textColor }]}>
                  ₦{Math.round(item.total_amount).toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={textSecondaryColor}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Ordered:
              </Text>
              <Text style={[styles.date, { color: textColor }]}>
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          </View>

          {/* Delivery Method */}
          {item.delivery_method && (
            <View
              style={[
                styles.deliveryMethodContainer,
                { borderColor: dividerColor },
              ]}
            >
              <Ionicons
                name={
                  item.delivery_method === "delivery"
                    ? "car-outline"
                    : "location-outline"
                }
                size={16}
                color={idColor}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={[styles.deliveryMethodText, { color: textColor }]}>
                {item.delivery_method === "delivery" ? "Delivery" : "Pickup"}
                {item.delivery_address &&
                  item.delivery_method === "delivery" && (
                    <Text
                      style={{
                        color: textSecondaryColor,
                        fontSize: Typography.sizes.xs,
                      }}
                    >
                      {" "}
                      to {item.delivery_address}
                    </Text>
                  )}
              </Text>
            </View>
          )}

          {/* Show total items count only if expanded or pending */}
          {(item.status === "pending" || isExpanded) && (
            <View style={styles.infoRow}>
              <Ionicons
                name="list-outline"
                size={16}
                color={textSecondaryColor}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Total Items:
              </Text>
              <Text style={[styles.itemsCount, { color: textColor }]}>
                {productsArray.reduce((sum, prod) => sum + prod.quantity, 0)}
              </Text>
            </View>
          )}
        </View>

        {/* User Information */}
        {item.user && (
          <View style={[styles.buyerSection, { borderTopColor: dividerColor }]}>
            <View style={styles.buyerHeader}>
              <Ionicons
                name="person-outline"
                size={18}
                color={idColor}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={[styles.buyerSectionTitle, { color: textColor }]}>
                Buyer Information
              </Text>
            </View>
            <View style={styles.buyerInfo}>
              <View style={styles.buyerAvatarContainer}>
                {item.user.avatar_url ? (
                  <Image
                    source={{ uri: item.user.avatar_url }}
                    style={styles.buyerAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.buyerAvatar,
                      { backgroundColor: borderColor },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color={textSecondaryColor}
                    />
                  </View>
                )}
              </View>
              <View style={styles.buyerDetails}>
                <Text style={[styles.buyerName, { color: textColor }]}>
                  {item.user.full_name || "Unknown User"}
                </Text>
                {item.user.email && (
                  <Text
                    style={[styles.buyerEmail, { color: textSecondaryColor }]}
                  >
                    {item.user.email}
                  </Text>
                )}
              </View>
              <Button
                title="Chat"
                onPress={() => handleChatWithBuyer(item.user_id!, item)}
                variant="outline"
                size="small"
                leftIcon={
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={idColor}
                  />
                }
                style={styles.chatButton}
              />
            </View>
          </View>
        )}

        {/* Action buttons - only for pending orders */}
        {item.status === "pending" && (
          <View style={styles.actionButtons}>
            <Button
              title={updating[item.id] ? "Confirming..." : "Confirm Order"}
              onPress={() => handleConfirmOrder(item)}
              loading={!!updating[item.id]}
              disabled={!!updating[item.id]}
              variant="primary"
              leftIcon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#fff"
                />
              }
              style={styles.confirmButton}
            />
            <Button
              title={updating[item.id] ? "Rejecting..." : "Reject Order"}
              onPress={() => handleUpdateStatus(item.id, "rejected")}
              loading={!!updating[item.id]}
              disabled={!!updating[item.id]}
              variant="danger"
              leftIcon={
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
              }
              style={styles.rejectButton}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!user) return null;
  return (
    <ThemedView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Seller Orders" showBackButton />
      {loading ? (
        <LoadingScreen />
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: textColor }}>
            No one has ordered your product.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginHorizontal: Spacing.sm,
  },
  // Products section
  productsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productItem: {
    width: "30%",
    alignItems: "center",
    marginVertical: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#eee",
  },
  productName: {
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  quantityBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  productQuantity: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: "#fff",
  },
  // Order details
  orderDetails: {
    marginTop: Spacing.lg,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  orderInfo: {
    marginTop: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    marginRight: Spacing.sm,
  },
  totalAmount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  date: {
    fontSize: Typography.sizes.sm,
  },
  itemsCount: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  // Delivery method
  deliveryMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  deliveryMethodText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  // Buyer section
  buyerSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  buyerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  buyerSectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  buyerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  buyerAvatarContainer: {
    marginRight: Spacing.md,
  },
  buyerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  buyerEmail: {
    fontSize: Typography.sizes.sm,
  },
  chatButton: {
    marginLeft: Spacing.sm,
  },
  // Action buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  confirmButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
});
