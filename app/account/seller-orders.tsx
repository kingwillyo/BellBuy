import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
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
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({ light: "#222", dark: "#fff" }, "text");
  const idColor = "#0A84FF";
  const cardBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#282828" },
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
      // Fetch all orders for this seller with user information
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
        .eq("seller_id", user.id)
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

  const handleChatWithBuyer = async (buyerId: string) => {
    try {
      // Find existing conversation between user and buyer
      let conversationId = null;
      const { data: existingConvos, error: convoError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user?.id);

      if (convoError) {
        console.error("Error checking conversations:", convoError);
        return;
      }

      // Find a conversation where both user and buyer are participants
      let foundConvo = null;
      if (existingConvos && existingConvos.length > 0) {
        for (const convo of existingConvos) {
          const { data: buyerInConvo } = await supabase
            .from("conversation_participants")
            .select("id")
            .eq("conversation_id", convo.conversation_id)
            .eq("user_id", buyerId)
            .single();

          if (buyerInConvo) {
            foundConvo = convo.conversation_id;
            break;
          }
        }
      }

      if (foundConvo) {
        conversationId = foundConvo;
      } else {
        // Create new conversation and add both participants
        const { data: newConvo, error: newConvoError } = await supabase
          .from("conversations")
          .insert({})
          .select()
          .maybeSingle();

        if (newConvoError || !newConvo) {
          console.error("Error creating conversation:", newConvoError);
          return;
        }

        conversationId = newConvo.id;
        // Add both participants
        await supabase.from("conversation_participants").insert([
          {
            conversation_id: conversationId,
            user_id: user?.id,
            role: "seller",
            joined_at: new Date().toISOString(),
          },
          {
            conversation_id: conversationId,
            user_id: buyerId,
            role: "buyer",
            joined_at: new Date().toISOString(),
          },
        ]);
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
      name: products[item.product_id]?.name || "Product",
      main_image: products[item.product_id]?.main_image,
      quantity: item.quantity,
    }));

    // If no products, fallback to single product_id
    if (!productsArray.length && item.product_id) {
      productsArray.push({
        product_id: item.product_id,
        name: products[item.product_id]?.name || "Product",
        main_image: products[item.product_id]?.main_image,
        quantity: item.quantity || 1,
      });
    }

    const isExpanded = expandedOrders[item.id] || false;
    const isCompleted =
      item.status === "confirmed" || item.status === "rejected";

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: cardBackgroundColor, borderWidth: 0 },
        ]}
        onPress={() => toggleOrderExpanded(item.id)}
        activeOpacity={0.7}
      >
        {/* Product Images and Names - only show if pending or expanded */}
        {(item.status === "pending" || isExpanded) && (
          <View style={styles.productsSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Products Ordered:
            </Text>
            <View style={styles.productsGrid}>
              {productsArray.map((prod, idx) => (
                <View key={prod.product_id || idx} style={styles.productItem}>
                  {prod.main_image ? (
                    <Image
                      source={{ uri: prod.main_image }}
                      style={styles.productImage}
                    />
                  ) : (
                    <View
                      style={[styles.productImage, { backgroundColor: "#eee" }]}
                    />
                  )}
                  <Text
                    style={[
                      styles.productName,
                      { color: textColor, textAlign: "center", marginTop: 4 },
                    ]}
                    numberOfLines={2}
                  >
                    {prod.name || "Product"}
                  </Text>
                  <Text style={[styles.productQuantity, { color: textColor }]}>
                    Qty: {prod.quantity}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderId, { color: idColor }]}>
              Order #{item.id}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusLabel, { color: textColor }]}>
              Status:{" "}
            </Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    item.status === "pending"
                      ? "#FF9500"
                      : item.status === "confirmed"
                        ? idColor
                        : item.status === "rejected"
                          ? "#FF3B30"
                          : textColor,
                },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          {item.total_amount !== undefined && (
            <Text style={[styles.totalAmount, { color: textColor }]}>
              Total: ₦{Math.round(item.total_amount).toLocaleString()}
            </Text>
          )}
          <Text style={[styles.date, { color: textColor }]}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>

          {/* Delivery Method */}
          {item.delivery_method && (
            <View style={styles.deliveryMethodContainer}>
              <Ionicons
                name={
                  item.delivery_method === "delivery"
                    ? "car-outline"
                    : "location-outline"
                }
                size={16}
                color="#0A84FF"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.deliveryMethodText, { color: textColor }]}>
                {item.delivery_method === "delivery" ? "Delivery" : "Pickup"}
                {item.delivery_address &&
                  item.delivery_method === "delivery" && (
                    <Text style={{ color: "#666", fontSize: 12 }}>
                      {" "}
                      to {item.delivery_address}
                    </Text>
                  )}
              </Text>
            </View>
          )}

          {/* Show total items count only if expanded or pending */}
          {(item.status === "pending" || isExpanded) && (
            <Text style={[styles.itemsCount, { color: textColor }]}>
              Total Items:{" "}
              {productsArray.reduce((sum, prod) => sum + prod.quantity, 0)}
            </Text>
          )}
        </View>

        {/* User Information */}
        {item.user && (
          <View style={styles.buyerSection}>
            <View style={styles.buyerHeader}>
              <Ionicons
                name="person-outline"
                size={16}
                color="#0A84FF"
                style={{ marginRight: 6 }}
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
                    style={[styles.buyerAvatar, { backgroundColor: "#E5E5E5" }]}
                  >
                    <Ionicons name="person" size={20} color="#999" />
                  </View>
                )}
              </View>
              <View style={styles.buyerDetails}>
                <Text style={[styles.buyerName, { color: textColor }]}>
                  {item.user.full_name || "Unknown User"}
                </Text>
                {item.user.email && (
                  <Text style={[styles.buyerEmail, { color: "#666" }]}>
                    {item.user.email}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => handleChatWithBuyer(item.user_id!)}
                activeOpacity={0.7}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#0A84FF" />
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action buttons - only for pending orders */}
        {item.status === "pending" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleConfirmOrder(item)}
              disabled={!!updating[item.id]}
            >
              <Text style={styles.actionButtonText}>
                {updating[item.id] ? "Confirming..." : "Confirm Order"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleUpdateStatus(item.id, "rejected")}
              disabled={!!updating[item.id]}
            >
              <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                {updating[item.id] ? "Rejecting..." : "Reject Order"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!user) return null;
  // Move SafeAreaView to wrap the entire screen for all states
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          zIndex: 10,
          height: 56,
          backgroundColor: headerBackgroundColor,
        }}
      >
        <TouchableOpacity
          style={{
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
            width: 40,
          }}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        <ThemedText
          style={{
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
            flex: 1,
            color: textColor,
          }}
        >
          Seller Orders
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
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
    </SafeAreaView>
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
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 0,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  productName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  orderId: {
    fontSize: 13,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  productsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  productItem: {
    width: "30%", // Adjust as needed for grid layout
    alignItems: "center",
    marginVertical: 8,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  productQuantity: {
    fontSize: 12,
    marginTop: 4,
  },
  orderDetails: {
    marginTop: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: "#0A84FF",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemsCount: {
    fontSize: 14,
    marginTop: 8,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  expandHint: {
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 10,
  },
  // New styles for delivery method and buyer info
  deliveryMethodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  deliveryMethodText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buyerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  buyerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  buyerSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  buyerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  buyerAvatarContainer: {
    marginRight: 12,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  buyerEmail: {
    fontSize: 13,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#0A84FF",
  },
  chatButtonText: {
    color: "#0A84FF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
});
