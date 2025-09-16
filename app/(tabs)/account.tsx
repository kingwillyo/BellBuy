/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { UserProfileCard } from "@/components/UserProfileCard";
import { BorderRadius, Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const generalOptions = [
  { key: "messages", label: "Messages", icon: "chatbubble-outline" },
  { key: "address", label: "Address", icon: "location-outline" },
  { key: "payment", label: "Payment", icon: "card-outline" },
];

const buyingSellingOptions = [
  { key: "order", label: "Orders", icon: "bag-outline" },
  { key: "my-products", label: "My Listings", icon: "pricetag-outline" },
  { key: "seller-orders", label: "Seller Orders", icon: "list-outline" },
];

const helpSupportOptions = [
  { key: "get-help", label: "Get help", icon: "help-circle-outline" },
  {
    key: "our-guidelines",
    label: "Our guidelines",
    icon: "document-text-outline",
  },
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
    if (key === "messages") router.push("/chat/ChatListScreen");
    else if (key === "order") router.push("/account/orders");
    else if (key === "address") router.push("/account/address");
    else if (key === "payment") router.push("/account/payment");
    else if (key === "my-products") router.push("/account/my-products");
    else if (key === "seller-orders") router.push("/account/seller-orders");
    else if (key === "get-help") router.push("/account/help");
    else if (key === "our-guidelines") router.push("/account/guidelines");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemedView style={styles.container}>
        <View style={styles.headerContainer}>
          <ThemedText style={styles.header}>Account</ThemedText>
          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={() => router.push("/account/feedback")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-outline"
              size={20}
              color={colors.tint}
              style={styles.feedbackIcon}
            />
            <ThemedText style={[styles.feedbackText, { color: colors.tint }]}>
              Give feedback
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      </ThemedView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.scrollContainer}>
          {/* User Profile Card */}
          <UserProfileCard onPress={() => router.push("/account/profile")} />

          <View style={styles.optionsList}>
            {/* General Options */}
            {generalOptions.map((opt) => {
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={24}
                      color={colors.tint}
                      style={styles.optionIcon}
                    />
                    <ThemedText style={styles.optionLabel}>
                      {opt.label}
                    </ThemedText>
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
                </TouchableOpacity>
              );
            })}

            {/* Buying and Selling Section */}
            <ThemedText style={styles.sectionHeader} type="heading">
              Buying and selling
            </ThemedText>
            {buyingSellingOptions.map((opt) => {
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={24}
                      color={colors.tint}
                      style={styles.optionIcon}
                    />
                    <ThemedText style={styles.optionLabel}>
                      {opt.label}
                    </ThemedText>
                  </View>
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

            {/* Help and Support Section */}
            <ThemedText style={styles.sectionHeader} type="heading">
              Help and support
            </ThemedText>
            {helpSupportOptions.map((opt) => {
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={24}
                      color={colors.tint}
                      style={styles.optionIcon}
                    />
                    <ThemedText style={styles.optionLabel}>
                      {opt.label}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  scrollContainer: {
    paddingHorizontal: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: "transparent",
  },
  feedbackIcon: {
    marginRight: Spacing.xs,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "500",
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
  sectionHeader: {
    marginLeft: Spacing.xxl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});
