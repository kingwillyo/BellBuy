import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
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
  created_at?: string;
  products?: any[]; // Added for multiple products
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
      // Fetch all orders for this seller
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
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
        if (!orderItemsError && orderItemsData) {
          allOrderItems = orderItemsData;
        }
      }
      // Map orderId -> array of productIds
      const orderIdToProductIds: { [orderId: number]: string[] } = {};
      allOrderItems.forEach((item) => {
        if (!orderIdToProductIds[item.order_id])
          orderIdToProductIds[item.order_id] = [];
        orderIdToProductIds[item.order_id].push(item.product_id);
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
        if (!productError && productData) {
          for (const p of productData) productMap[p.id] = p;
        }
      }
      // Attach productIds to each order
      const ordersWithProducts = (orderData || []).map((order) => ({
        ...order,
        product_ids: orderIdToProductIds[order.id] || [],
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
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      // Refresh orders
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (e: any) {
      setError(e.message || "Failed to update order status");
    } finally {
      setUpdating((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Restore the renderItem function for FlatList
  const renderItem = ({
    item,
  }: {
    item: Order & { product_ids: string[] };
  }) => {
    // Build productsArray from product_ids
    const productsArray = (item.product_ids || []).map((pid) => ({
      product_id: pid,
      name: products[pid]?.name || "Product",
      main_image: products[pid]?.main_image,
    }));
    // If no products, fallback to single product_id
    if (!productsArray.length && item.product_id) {
      productsArray.push({
        product_id: item.product_id,
        name: products[item.product_id]?.name || "Product",
        main_image: products[item.product_id]?.main_image,
      });
    }
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBackgroundColor, borderWidth: 0 },
        ]}
      >
        {/* Product Images and Names at the top */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          {productsArray.map((prod, idx) => (
            <View
              key={prod.product_id || idx}
              style={{ alignItems: "center", marginRight: 12 }}
            >
              {prod.main_image ? (
                <Image source={{ uri: prod.main_image }} style={styles.image} />
              ) : (
                <View style={[styles.image, { backgroundColor: "#eee" }]} />
              )}
              <Text
                style={[
                  styles.productName,
                  { color: textColor, textAlign: "center", marginTop: 4 },
                ]}
              >
                {prod.name || "Product"}
              </Text>
            </View>
          ))}
        </View>
        {/* Order Details below images/names */}
        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.orderId, { color: idColor }]}>
            Order #{item.id}
          </Text>
          <Text style={{ color: textColor }}>Status: {item.status}</Text>
          {item.total_amount !== undefined && (
            <Text style={{ color: textColor }}>
              Total: ₦{Math.round(item.total_amount).toLocaleString()}
            </Text>
          )}
          <Text style={[styles.date, { color: textColor }]}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>
        {/* Action buttons remain unchanged */}
        {item.status === "pending" && (
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Button
              title={updating[item.id] ? "Confirming..." : "Confirm"}
              onPress={() => handleUpdateStatus(item.id, "confirmed")}
              disabled={!!updating[item.id]}
            />
            <View style={{ width: 10 }} />
            <Button
              title={updating[item.id] ? "Rejecting..." : "Reject"}
              color="red"
              onPress={() => handleUpdateStatus(item.id, "rejected")}
              disabled={!!updating[item.id]}
            />
          </View>
        )}
      </View>
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
          <Text>No orders found.</Text>
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
});
