import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export const options = { headerShown: false };

export default function OrdersScreen() {
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    accessToken,
  } = useAuth();
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#F1F1F1", dark: "#333" },
    "background"
  );
  const labelColor = useThemeColor(
    { light: "#8F9BB3", dark: "#8F9BB3" },
    "text"
  );
  const valueColor = useThemeColor({}, "text");
  const priceColor = useThemeColor(
    { light: "#0095FF", dark: "#4F8EF7" },
    "text"
  );
  const textColor = useThemeColor({}, "text");
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const idColor = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");

  // Redirect to sign in if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/signin");
    }
  }, [authLoading, isAuthenticated, router]);

  React.useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) return;

    setLoading(true);
    setError("");

    // Explicitly filter by user_id to show only orders where current user is the buyer
    supabase
      .from("orders")
      .select("*, order_items(product:products(*))")
      .eq("user_id", user.id) // Explicitly filter by user_id
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message || "Failed to fetch orders");
          setOrders([]);
        } else {
          setOrders(data || []);
        }
        setLoading(false);
      });
  }, [isAuthenticated, accessToken, user]);

  const renderOrder = ({ item }: { item: any }) => {
    // Format date
    const date = item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : "";
    // Try to parse products array from item.products (if exists)
    let productsArray: any[] = [];
    if (item.products) {
      try {
        productsArray = Array.isArray(item.products)
          ? item.products
          : JSON.parse(item.products);
      } catch {
        productsArray = [];
      }
    }
    // If no products array, fall back to single product
    if (!productsArray.length && item.product_id) {
      productsArray = [
        {
          product_id: item.product_id,
          name: item.product_name || "Product",
          main_image: item.product_image,
          price: item.total_amount,
          quantity: item.quantity,
        },
      ];
    }
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor, width: width - 32 },
        ]}
        onPress={() => router.push(`/orders/${item.id}`)}
        activeOpacity={0.8}
      >
        <ThemedText style={[styles.orderId, { color: idColor }]}>
          Order #{item.id}
        </ThemedText>
        <ThemedText style={[styles.orderDate, { color: textColor }]}>
          Order at BellsBuy : {date}
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        {productsArray.map((prod, idx) => (
          <View
            key={prod.product_id || idx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            {prod.main_image ? (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                  overflow: "hidden",
                  marginRight: 12,
                }}
              >
                <img
                  src={prod.main_image}
                  alt={prod.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </View>
            ) : (
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                  marginRight: 12,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <ThemedText
                style={[styles.label, { color: textColor, fontWeight: "bold" }]}
              >
                {prod.name || "Product"}
              </ThemedText>
              <ThemedText style={{ color: textColor }}>
                Quantity: {prod.quantity}
              </ThemedText>
              <ThemedText style={{ color: textColor }}>
                Price: ₦{Math.round(prod.price).toLocaleString()}
              </ThemedText>
            </View>
          </View>
        ))}
        <View style={styles.row}>
          <ThemedText style={[styles.label, { color: textColor }]}>
            Order Status
          </ThemedText>
          <ThemedText style={[styles.value, { color: textColor }]}>
            {item.status}
          </ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText style={[styles.label, { color: textColor }]}>
            Payment Status
          </ThemedText>
          <ThemedText style={[styles.value, { color: textColor }]}>
            {item.payment_status}
          </ThemedText>
        </View>
        <View style={styles.row}>
          <ThemedText style={[styles.label, { color: textColor }]}>
            Total
          </ThemedText>
          <ThemedText style={[styles.price, { color: idColor }]}>
            ₦{Math.round(item.total_amount).toLocaleString()}
          </ThemedText>
        </View>

        {/* Show verification code for shipped/processing orders */}
        {(item.status === "shipped" || item.status === "processing") &&
          item.verification_code && (
            <View
              style={[
                styles.verificationSection,
                { backgroundColor: "#F0F8FF", borderColor },
              ]}
            >
              <View style={styles.verificationHeader}>
                <Ionicons name="key-outline" size={16} color={idColor} />
                <ThemedText
                  style={[styles.verificationTitle, { color: idColor }]}
                >
                  Verification Code
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.verificationCode, { color: textColor }]}
              >
                {item.verification_code}
              </ThemedText>
              <ThemedText
                style={[styles.verificationNote, { color: labelColor }]}
              >
                Give this code to the seller when you receive your order
              </ThemedText>
            </View>
          )}

        {/* Show completion message for completed orders */}
        {item.status === "completed" && (
          <View
            style={[
              styles.completedSection,
              { backgroundColor: "#F0FFF0", borderColor },
            ]}
          >
            <View style={styles.completedHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <ThemedText style={[styles.completedTitle, { color: "#34C759" }]}>
                Order Completed
              </ThemedText>
            </View>
            <ThemedText style={[styles.completedNote, { color: labelColor }]}>
              Your order has been delivered and verified
            </ThemedText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
        <ThemedView style={styles.container}>
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
              onPress={() => router.replace("/")}
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
              Orders
            </ThemedText>
            <View style={{ width: 40 }} />
          </View>
          <LoadingScreen />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
      <ThemedView style={styles.container}>
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
            onPress={() => router.replace("/")}
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
            Orders
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>
        {orders.length === 0 ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ThemedText style={{ color: textColor, fontSize: 16 }}>
              {error ? error : "No orders found."}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0 }}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    alignSelf: "center",
  },
  orderId: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222B45",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 13,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    width: "100%",
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
  },
  price: {
    fontSize: 15,
    fontWeight: "bold",
  },
  verificationSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  verificationCode: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 2,
  },
  verificationNote: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  completedSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  completedNote: {
    fontSize: 12,
    textAlign: "center",
  },
});
