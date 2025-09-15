import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useCart } from "../context/CartContext";
import { useAuth } from "../hooks/useAuth";
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

const EDGE_FUNCTION_URL =
  "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order";

export default function SuccessScreen() {
  const { reference, order_id, total_orders } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const lastReference = useRef<string | null>(null);
  const creatingOrder = useRef(false);
  const hasInitialized = useRef(false);
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  // Use the same blue as Add to Cart button
  const blue = "#0A84FF";

  // Debug log for params
  logger.debug(
    "SuccessScreen params",
    {
      hasReference: !!reference,
      hasOrderId: !!order_id,
      totalOrders: total_orders,
    },
    { component: "SuccessScreen" }
  );

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading

    // Prevent duplicate processing for the same reference
    const currentReference = Array.isArray(reference)
      ? reference[0]
      : reference;
    if (orderCreated && lastReference.current === currentReference) {
      setLoading(false);
      return;
    }

    // Prevent multiple initializations
    if (hasInitialized.current) {
      return;
    }

    // If no reference, redirect to home
    if (!currentReference) {
      router.replace("/");
      return;
    }

    if (creatingOrder.current) return; // Prevent concurrent calls
    creatingOrder.current = true;
    hasInitialized.current = true;

    async function handleSuccess() {
      if (!user) {
        setError("Missing user (not logged in). Please sign in again.");
        setLoading(false);
        creatingOrder.current = false;
        return;
      }
      if (!currentReference) {
        setError(
          "Missing payment reference. Please try again or contact support."
        );
        setLoading(false);
        creatingOrder.current = false;
        return;
      }

      try {
        // Orders are already created in the checkout process
        // Just mark as successful and clear cart
        await clearCart();
        setOrderCreated(true);
        lastReference.current = currentReference;
        setLoading(false);
        creatingOrder.current = false;
      } catch (e: any) {
        setError(e?.message || "Failed to process order");
        setLoading(false);
        creatingOrder.current = false;
      }
    }
    handleSuccess();

    // Cleanup function
    return () => {
      creatingOrder.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reference, clearCart, authLoading]);

  // Redirect to sign in if not authenticated
  if (!authLoading && !user) {
    router.replace("/auth/signin");
    return null;
  }

  if (authLoading || loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#084F" />
        <ThemedText
          style={{
            color: textColor,
            fontSize: 16,
            textAlign: "center",
            marginVertical: 8,
          }}
        >
          Processing your order...
        </ThemedText>
      </ThemedView>
    );
  }
  if (error) {
    return (
      <ThemedView style={[styles.center, { backgroundColor }]}>
        <ThemedText
          style={{
            color: "red",
            fontSize: 16,
            textAlign: "center",
            marginVertical: 8,
          }}
        >
          Error: {error}
        </ThemedText>
        <ThemedText
          style={{
            color: textColor,
            fontSize: 16,
            textAlign: "center",
            marginVertical: 8,
          }}
          onPress={() => router.replace("/")}
        >
          Go Home
        </ThemedText>
      </ThemedView>
    );
  }
  return (
    <ThemedView
      key={`success-${reference}`}
      style={[styles.center, { backgroundColor }]}
    >
      <View style={styles.iconWrapper}>
        <IconSymbol name="checkmark.circle.fill" size={80} color={blue} />
      </View>
      <ThemedText style={styles.successText}>Success</ThemedText>
      <ThemedText style={styles.subText}>
        {total_orders &&
        Array.isArray(total_orders) &&
        parseInt(total_orders[0]) > 1
          ? `Thank you for shopping! ${total_orders[0]} orders have been created.`
          : total_orders &&
              !Array.isArray(total_orders) &&
              parseInt(total_orders) > 1
            ? `Thank you for shopping! ${total_orders} orders have been created.`
            : "Thank you for shopping!"}
      </ThemedText>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: blue }]}
        activeOpacity={0.8}
        onPress={() => {
          // If we have a specific order_id and only one order, go to order details
          // Otherwise, go to orders list
          const orderId = Array.isArray(order_id) ? order_id[0] : order_id;
          const totalOrdersCount = Array.isArray(total_orders)
            ? parseInt(total_orders[0])
            : parseInt(total_orders || "1");

          if (orderId && totalOrdersCount === 1) {
            router.push(`/orders/${orderId}`);
          } else {
            router.replace("/account/orders");
          }
        }}
      >
        <ThemedText style={styles.buttonText}>
          {(() => {
            const orderId = Array.isArray(order_id) ? order_id[0] : order_id;
            const totalOrdersCount = Array.isArray(total_orders)
              ? parseInt(total_orders[0])
              : parseInt(total_orders || "1");
            return orderId && totalOrdersCount === 1
              ? "View Order"
              : "View Orders";
          })()}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  iconWrapper: {
    marginBottom: 16, // Reduce margin to avoid pushing text up
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  successText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0A84FF",
    marginBottom: 8,
    textAlign: "center",
    paddingTop: 8, // Add padding to ensure text is not clipped
  },
  subText: {
    fontSize: 14,
    color: "#8F9BB3",
    marginBottom: 32,
    textAlign: "center",
  },
  button: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
