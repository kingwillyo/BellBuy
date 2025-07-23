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
import { supabase } from "../lib/supabase";

const EDGE_FUNCTION_URL =
  "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order";

export default function SuccessScreen() {
  const { reference, seller_id, total_amount, shipping_fee, product_price } =
    useLocalSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const lastReference = useRef<string | null>(null);
  const creatingOrder = useRef(false);
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  // Use the same blue as Add to Cart button
  const blue = "#0A84FF";

  // Debug log for params
  console.log("[SuccessScreen] params:", {
    reference,
    seller_id,
    total_amount,
  });

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    // Prevent duplicate order creation for the same reference
    if (orderCreated && lastReference.current === reference) {
      setLoading(false);
      return;
    }
    if (creatingOrder.current) return; // Prevent concurrent calls
    creatingOrder.current = true;
    async function callEdgeFunction() {
      if (!user) {
        setError("Missing user (not logged in). Please sign in again.");
        setLoading(false);
        creatingOrder.current = false;
        return;
      }
      if (!reference) {
        setError(
          "Missing payment reference. Please try again or contact support."
        );
        setLoading(false);
        creatingOrder.current = false;
        return;
      }
      if (!seller_id) {
        setError("Missing seller_id. Please try again or contact support.");
        setLoading(false);
        creatingOrder.current = false;
        return;
      }
      if (!total_amount) {
        setError("Missing total_amount. Please try again or contact support.");
        setLoading(false);
        creatingOrder.current = false;
        return;
      }
      try {
        // Get access token
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        if (!accessToken) throw new Error("No access token");
        // Debug log for outgoing values
        console.log("[SuccessScreen] Sending to Edge Function:", {
          buyer_id: user.id,
          seller_id,
          total_amount: Number(total_amount),
          reference,
          shipping_fee: Number(shipping_fee),
          product_price: Number(product_price),
        });
        // Call Edge Function
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            buyer_id: user.id,
            seller_id,
            total_amount: Number(total_amount),
            reference,
            shipping_fee: Number(shipping_fee),
            product_price: Number(product_price),
          }),
        });
        const rawText = await res.text();
        console.log("[SuccessScreen] Edge Function raw response:", rawText);
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          throw new Error("Invalid JSON from Edge Function: " + rawText);
        }
        if (!res.ok && !data?.message?.includes("already exists"))
          throw new Error(data.error || "Order failed");
        await clearCart();
        setOrderCreated(true);
        lastReference.current = Array.isArray(reference)
          ? reference[0]
          : reference ?? null;
        setLoading(false);
        creatingOrder.current = false;
      } catch (e: any) {
        setError(e?.message || "Order failed");
        setLoading(false);
        creatingOrder.current = false;
      }
    }
    callEdgeFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reference, seller_id, total_amount, clearCart, authLoading]);

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
    <ThemedView style={[styles.center, { backgroundColor }]}>
      <View style={styles.iconWrapper}>
        <IconSymbol name="checkmark.circle.fill" size={80} color={blue} />
      </View>
      <ThemedText style={styles.successText}>Success</ThemedText>
      <ThemedText style={styles.subText}>thank you for shopping</ThemedText>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: blue }]}
        activeOpacity={0.8}
        onPress={() => router.replace("/account/orders")}
      >
        <ThemedText style={styles.buttonText}>Back To Order</ThemedText>
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
