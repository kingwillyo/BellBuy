/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const options = [
  { key: "profile", label: "Profile", icon: "person-outline" },
  { key: "messages", label: "Messages", icon: "chatbubble-outline" },
  { key: "order", label: "Orders", icon: "bag-outline" },
  { key: "address", label: "Address", icon: "location-outline" },
  { key: "payment", label: "Payment", icon: "card-outline" },
  { key: "my-products", label: "My Listings", icon: "pricetag-outline" },
  { key: "seller-orders", label: "Seller Orders", icon: "list-outline" },
  { key: "super-flash-sale", label: "Super Flash Sale", icon: "flash-outline" },
];

export default function ProfileScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);
  const [pressed, setPressed] = useState<string | null>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_user_total_unread_count");
    if (!error && data !== null) {
      setUnreadCount(data);
    }
  }, [user]);

  const fetchPendingOrdersCount = useCallback(async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("status", "pending");
    if (!error && typeof count === "number") {
      setPendingOrdersCount(count);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnread();
    fetchPendingOrdersCount();

    // Subscribe to real-time updates on user_conversation_unread table
    const channel = supabase
      .channel("user-unread-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_conversation_unread",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch unread count when user's unread counts change
          fetchUnread();
        }
      )
      .subscribe();

    // Subscribe to pending orders updates for this seller
    const ordersChannel = supabase
      .channel("seller-pending-orders-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          fetchPendingOrdersCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user, fetchUnread, fetchPendingOrdersCount]);

  useFocusEffect(
    useCallback(() => {
      fetchUnread();
      fetchPendingOrdersCount();
    }, [fetchUnread, fetchPendingOrdersCount])
  );

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Return null if not authenticated (redirect will be triggered by useAuth)
  if (!isLoading && !user) {
    return null;
  }

  const handlePress = (key: string) => {
    setPressed(key);
    setTimeout(() => setPressed(null), 200);
    // Navigation
    if (key === "profile") router.push("/account/profile");
    else if (key === "messages") router.push("/chat/ChatListScreen");
    else if (key === "order") router.push("/account/orders");
    else if (key === "address") router.push("/account/address");
    else if (key === "payment") router.push("/account/payment");
    else if (key === "my-products") router.push("/account/my-products");
    else if (key === "seller-orders") router.push("/account/seller-orders");
    else if (key === "super-flash-sale")
      router.push("/account/super-flash-sale");
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={[styles.header, { paddingTop: insets.top }]}>
        Account
      </ThemedText>
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <View style={styles.optionsList}>
        {options.map((opt) => {
          const isPressed = opt.key === pressed;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionRow,
                isPressed && { backgroundColor: colors.backgroundTertiary },
              ]}
              activeOpacity={0.8}
              onPress={() => handlePress(opt.key)}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={24}
                  color={colors.tint}
                  style={styles.optionIcon}
                />
                <ThemedText style={styles.optionLabel}>{opt.label}</ThemedText>
              </View>
              {opt.key === "messages" && unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#FF3B30",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {Math.min(unreadCount, 99)}
                  </ThemedText>
                </View>
              )}
              {opt.key === "seller-orders" && pendingOrdersCount > 0 && (
                <View
                  style={{
                    backgroundColor: "#FF3B30",
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    minWidth: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ThemedText
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {Math.min(pendingOrdersCount, 99)}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.sm,
    marginHorizontal: 0,
  },
  optionsList: {
    marginTop: 0,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  optionIcon: {
    marginRight: Spacing.lg,
  },
  optionLabel: {
    fontSize: 17,
  },
});
