import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user || !id) return;
    fetchOrderDetails();
  }, [user, id]);

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

  const getStatusStep = (status: string) => {
    const statusMap: { [key: string]: number } = {
      pending: 0,
      confirmed: 1,
      shipped: 2,
      delivered: 3,
    };
    return statusMap[status] || 0;
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

  const currentStep = getStatusStep(order.status);
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
            <View style={styles.progressBar}>
              <View
                style={[styles.progressLine, { backgroundColor: colors.tint }]}
              />
            </View>

            {[
              { step: 0, title: "Packing", icon: "cube-outline" },
              { step: 1, title: "Shipping", icon: "car-outline" },
              { step: 2, title: "Arriving", icon: "location-outline" },
              { step: 3, title: "Success", icon: "checkmark-circle-outline" },
            ].map((status, index) => (
              <View key={index} style={styles.statusStep}>
                <View
                  style={[
                    styles.statusCircle,
                    {
                      backgroundColor: getStatusColor(status.step, currentStep),
                      borderColor: getStatusColor(status.step, currentStep),
                    },
                  ]}
                >
                  {status.step <= currentStep ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={status.icon as any}
                      size={16}
                      color={colors.textTertiary}
                    />
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.statusText,
                    {
                      color:
                        status.step <= currentStep
                          ? colors.text
                          : colors.textTertiary,
                    },
                  ]}
                >
                  {status.title}
                </ThemedText>
              </View>
            ))}
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
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
          title="Notify Me"
          onPress={() => {
            // Handle notification logic
            console.log("Notify button pressed");
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
