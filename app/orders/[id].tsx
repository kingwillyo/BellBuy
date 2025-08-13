import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OrderItem {
  id: number;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product?: {
    id: string;
    name: string;
    main_image?: string;
    image_urls?: string[];
  };
}

interface Order {
  id: number;
  buyer_id: string;
  seller_id: string;
  total_amount: number;
  shipping_fee: number;
  seller_payout: number;
  payment_status: string;
  payout_status: string;
  status: string;
  reference: string;
  delivery_address?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

const screenWidth = Dimensions.get("window").width;

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<number>(Date.now());
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const previousStatusRef = useRef<string | null>(null);
  const notifyKey = id ? `notify_order_${id}` : undefined;
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Animation state for the progress bar and active step scale
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const stepScales = useRef(
    [0, 1, 2, 3].map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    if (!user || !id) return;
    fetchOrderDetails();
  }, [user, id]);

  // Subscribe to realtime status updates for this order
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-status-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          // Realtime payload includes the updated row in payload.new
          setOrder((prev) => ({
            ...(prev || ({} as Order)),
            ...(payload.new as any),
          }));
          setLastRealtimeAt(Date.now());
          const newStatus = (payload.new as any)?.status as string | undefined;
          const prevStatus = previousStatusRef.current;
          if (notifyEnabled && newStatus && newStatus !== prevStatus) {
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Order status updated",
                  body: `${getDisplayStatus(newStatus)} for order #${
                    payload.new.id
                  }`,
                },
                trigger: null,
              });
            } catch {}
          }
          previousStatusRef.current = newStatus || previousStatusRef.current;
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeReady(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Load persisted notify preference for this order
  useEffect(() => {
    if (!notifyKey) return;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(notifyKey);
        if (saved === "true") setNotifyEnabled(true);
      } catch {}
    })();
  }, [notifyKey]);
  // Keep last known status so we don't fire immediately after enabling
  useEffect(() => {
    if (order?.status) previousStatusRef.current = order.status;
  }, [order?.status]);

  // Fallback polling if realtime isn't enabled/ready
  useEffect(() => {
    if (isRealtimeReady) return;
    const interval = setInterval(() => {
      // If we haven't received a realtime event recently, re-fetch
      if (Date.now() - lastRealtimeAt > 8000) {
        fetchOrderDetails();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isRealtimeReady, lastRealtimeAt]);

  // Compute current step and wire animations BEFORE any early returns,
  // so hooks order stays consistent across renders
  const currentStep = getStatusStep(order?.status ?? "");

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: currentStep,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    stepScales.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentStep ? 1.1 : 1,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, [currentStep]);

  const fetchOrderDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch order details with order items and product information
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (
            id,
            product_id,
            quantity,
            price_at_purchase,
            product:products (
              id,
              name,
              main_image,
              image_urls
            )
          )
        `
        )
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error("Order not found");

      setOrder(orderData);
    } catch (err: any) {
      setError(err.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  // New status steps and mapping to database values
  const STATUS_STEPS = [
    { key: "approved", title: "Approved", icon: "checkmark-circle-outline" },
    { key: "picked_up", title: "Picked up", icon: "cube-outline" },
    { key: "in_transit", title: "In transit", icon: "car-outline" },
    { key: "delivered", title: "Delivered", icon: "checkmark-done-outline" },
  ] as const;

  function getStatusStep(status: string) {
    const normalized = (status || "").toLowerCase();
    const statusMap: { [key: string]: number } = {
      approved: 0,
      picked_up: 1,
      "picked up": 1,
      in_transit: 2,
      "in transit": 2,
      delivered: 3,
      // Explicit Pending: show no highlighted step
      pending: -1,
      rejected: -1,
      // Legacy fallbacks
      confirmed: 0,
      packing: -1,
      shipping: 1,
      shipped: 2,
    };
    return statusMap[normalized] ?? -1;
  }

  const getDisplayStatus = (status: string) => {
    const normalized = (status || "").toLowerCase();
    const labelMap: { [key: string]: string } = {
      approved: "Approved",
      picked_up: "Picked up",
      "picked up": "Picked up",
      in_transit: "In transit",
      "in transit": "In transit",
      delivered: "Delivered",
      pending: "Pending",
      rejected: "Rejected",
      // legacy
      confirmed: "Approved",
      packing: "Pending",
      shipping: "Picked up",
      shipped: "In transit",
    };
    if (labelMap[normalized]) return labelMap[normalized];
    // Fallback: title-case unknown values
    const pretty = normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return pretty || "Pending";
  };

  const getStatusColor = (step: number, currentStep: number) => {
    if (step <= currentStep) {
      return colors.tint;
    }
    return colors.borderColor;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${Math.round(amount).toLocaleString()}`;
  };

  if (authLoading || loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>
            Loading order details...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.error}
          />
          <ThemedText style={styles.errorTitle}>Order Not Found</ThemedText>
          <ThemedText style={styles.errorMessage}>
            {error ||
              "The order you're looking for doesn't exist or you don't have permission to view it."}
          </ThemedText>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            style={styles.errorButton}
          />
        </View>
      </ThemedView>
    );
  }
  const totalItems =
    order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0A84FF" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Progress */}
        <ThemedView variant="card" style={styles.statusCard}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Order Status
          </ThemedText>

          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: "rgba(10, 132, 255, 0.18)" },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor: colors.tint,
                    width:
                      currentStep < 0
                        ? "0%"
                        : animatedProgress.interpolate({
                            inputRange: [0, 1, 2, 3],
                            outputRange: ["0%", "33.33%", "66.66%", "100%"],
                          }),
                  },
                ]}
              />
            </View>

            {STATUS_STEPS.map((status, index) => {
              const isPendingState = currentStep < 0;
              const isCompleted = !isPendingState && index <= currentStep;
              const isFuture = !isPendingState && index > currentStep;
              const softTint = "rgba(10, 132, 255, 0.18)"; // soft blue fill for inactive steps

              const bgColor = isCompleted
                ? getStatusColor(index, currentStep)
                : isFuture
                ? softTint
                : "transparent";
              const borderColor = isCompleted
                ? getStatusColor(index, currentStep)
                : isFuture
                ? softTint
                : colors.borderColor;
              const iconName = isPendingState
                ? (status.icon as any)
                : ("checkmark" as any);
              const iconColor = isPendingState
                ? colors.textTertiary
                : "#FFFFFF";

              return (
                <View key={status.key} style={styles.statusStep}>
                  <View
                    style={[
                      styles.statusCircleMask,
                      { backgroundColor: colors.cardBackground },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.statusCircle,
                        {
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                          transform: [{ scale: stepScales[index] }],
                        },
                      ]}
                    >
                      <Ionicons name={iconName} size={16} color={iconColor} />
                    </Animated.View>
                  </View>
                  <ThemedText
                    style={[
                      styles.statusText,
                      {
                        color: isCompleted ? colors.text : colors.textTertiary,
                      },
                    ]}
                  >
                    {status.title}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </ThemedView>

        {/* Products Section */}
        <ThemedView variant="card" style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Products
          </ThemedText>

          {order.order_items?.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.productItem,
                { borderBottomColor: colors.divider },
              ]}
            >
              <View style={styles.productImageContainer}>
                <Image
                  source={{
                    uri:
                      item.product?.main_image ||
                      (item.product?.image_urls &&
                        item.product.image_urls[0]) ||
                      "https://via.placeholder.com/80",
                  }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.productInfo}>
                <ThemedText style={styles.productName}>
                  {item.product?.name || "Product"}
                </ThemedText>
                <ThemedText style={styles.productPrice}>
                  {formatCurrency(item.price_at_purchase)}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.productQuantity,
                    { color: colors.textTertiary },
                  ]}
                >
                  Quantity: {item.quantity}
                </ThemedText>
              </View>

              <TouchableOpacity style={styles.favoriteButton}>
                <Ionicons name="heart" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
        </ThemedView>

        {/* Shipping Details */}
        <ThemedView variant="card" style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Shipping Details
          </ThemedText>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Date Shipping
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatDate(order.created_at)}
            </ThemedText>
          </View>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Shipping
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              Standard Delivery
            </ThemedText>
          </View>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Order ID
            </ThemedText>
            <ThemedText style={styles.detailValue}>#{order.id}</ThemedText>
          </View>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Status
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {getDisplayStatus(order.status)}
            </ThemedText>
          </View>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Address
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {order.delivery_address || "Male Bronze 2 Annex"}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Payment Details */}
        <ThemedView variant="card" style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Payment Details
          </ThemedText>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Items ({totalItems})
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatCurrency(order.total_amount - order.shipping_fee)}
            </ThemedText>
          </View>

          <View
            style={[styles.detailRow, { borderBottomColor: colors.divider }]}
          >
            <ThemedText
              style={[styles.detailLabel, { color: colors.textTertiary }]}
            >
              Shipping
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {formatCurrency(order.shipping_fee)}
            </ThemedText>
          </View>

          <View
            style={[
              styles.detailRow,
              styles.totalRow,
              { borderTopColor: colors.divider },
            ]}
          >
            <ThemedText style={styles.totalLabel}>Total Price</ThemedText>
            <ThemedText style={[styles.totalValue, { color: colors.tint }]}>
              {formatCurrency(order.total_amount)}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View
        style={[
          styles.bottomButton,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Button
          title={notifyEnabled ? "Notifications On" : "Notify Me"}
          onPress={async () => {
            try {
              const { status: existingStatus } =
                await Notifications.getPermissionsAsync();
              let finalStatus = existingStatus;
              if (existingStatus !== "granted") {
                const { status } =
                  await Notifications.requestPermissionsAsync();
                finalStatus = status;
              }
              if (finalStatus !== "granted") return;
              setNotifyEnabled(true);
              if (order?.status) previousStatusRef.current = order.status;
              if (notifyKey) await AsyncStorage.setItem(notifyKey, "true");
            } catch {}
          }}
          variant="primary"
          size="large"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  errorButton: {
    marginTop: Spacing.lg,
  },
  statusCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  section: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  progressBar: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    height: 2,
    zIndex: 1,
  },
  progressLine: {
    height: "100%",
    borderRadius: 1,
  },
  // Creates a small mask to cut the line under the circle so the track doesn't cross the icon
  statusCircleMask: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statusStep: {
    alignItems: "center",
    zIndex: 2,
  },
  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginRight: Spacing.md,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  productQuantity: {
    fontSize: 14,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
