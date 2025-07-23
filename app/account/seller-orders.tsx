import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

  // Fetch orders and related products
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    let subscription: any = null;
    const fetchOrders = async () => {
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
      setOrders(orderData || []);
      // Fetch product details for all unique product_ids
      const uniqueProductIds = Array.from(
        new Set((orderData || []).map((o) => o.product_id))
      );
      if (uniqueProductIds.length > 0) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id, name, main_image")
          .in("id", uniqueProductIds);
        if (!productError && productData) {
          const productMap: { [id: string]: Product } = {};
          for (const p of productData) productMap[p.id] = p;
          setProducts(productMap);
        }
      }
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

  if (!user) return null;
  if (loading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: headerBackgroundColor }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              height: 56,
              backgroundColor: headerBackgroundColor,
            }}
          >
            <TouchableOpacity
              style={{ marginLeft: 16, marginRight: 8 }}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={26} color="#0A84FF" />
            </TouchableOpacity>
            <Header title="Seller Orders" style={{ flex: 1, marginLeft: 0 }} />
          </View>
        </SafeAreaView>
        <LoadingScreen />
      </ThemedView>
    );
  }
  if (error) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: headerBackgroundColor }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              height: 56,
              backgroundColor: headerBackgroundColor,
            }}
          >
            <TouchableOpacity
              style={{ marginLeft: 16, marginRight: 8 }}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={26} color="#0A84FF" />
            </TouchableOpacity>
            <Header title="Seller Orders" style={{ flex: 1, marginLeft: 0 }} />
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text style={{ color: "red" }}>{error}</Text>
        </View>
      </ThemedView>
    );
  }
  if (orders.length === 0) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: headerBackgroundColor }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              height: 56,
              backgroundColor: headerBackgroundColor,
            }}
          >
            <TouchableOpacity
              style={{ marginLeft: 16, marginRight: 8 }}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={26} color="#0A84FF" />
            </TouchableOpacity>
            <Header title="Seller Orders" style={{ flex: 1, marginLeft: 0 }} />
          </View>
        </SafeAreaView>
        <View style={styles.center}>
          <Text>No orders found.</Text>
        </View>
      </ThemedView>
    );
  }

  const renderItem = ({ item }: { item: Order }) => {
    const product = products[item.product_id];
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: cardBackgroundColor, borderWidth: 0 },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {product?.main_image ? (
            <Image source={{ uri: product.main_image }} style={styles.image} />
          ) : (
            <View style={[styles.image, { backgroundColor: "#eee" }]} />
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.productName, { color: textColor }]}>
              {product?.name || "Product"}
            </Text>
            <Text style={[styles.orderId, { color: idColor }]}>
              Order #{item.id}
            </Text>
            <Text style={{ color: textColor }}>Status: {item.status}</Text>
            <Text style={{ color: textColor }}>Quantity: {item.quantity}</Text>
            {item.total_amount !== undefined && (
              <Text style={{ color: textColor }}>
                Total: ₦{Math.round(item.total_amount).toLocaleString()}
              </Text>
            )}
            <Text style={[styles.date, { color: textColor }]}>
              {item.created_at
                ? new Date(item.created_at).toLocaleString()
                : ""}
            </Text>
          </View>
        </View>
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: headerBackgroundColor }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            height: 56,
            backgroundColor: headerBackgroundColor,
          }}
        >
          <TouchableOpacity
            style={{ marginLeft: 16, marginRight: 8 }}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>
          <Header title="Seller Orders" style={{ flex: 1, marginLeft: 0 }} />
        </View>
      </SafeAreaView>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
