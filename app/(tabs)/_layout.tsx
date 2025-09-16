import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

const getTabBarStyle = (colorScheme: string | null) => ({
  height: Platform.OS === "ios" ? 80 : 60, // Total desired height of the tab bar
  borderTopWidth: 1,
  borderTopColor: colorScheme === "dark" ? "#1C1C1E" : "#eee",
  backgroundColor: colorScheme === "dark" ? "#000000" : "#FFFFFF",
});

// Custom Cart Icon Component with Badge
const CartIconWithBadge = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "cart" : "cart-outline"}
        size={27}
        color={color}
      />
      {itemCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            backgroundColor: "#FF3B30",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: "white",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
};

// Custom Account Icon Component with Badge
const AccountIconWithBadge = ({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) => {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);

  const fetchTotalUnreadCount = useCallback(async () => {
    if (!user) {
      setTotalUnreadCount(0);
      return;
    }

    try {
      // Fetch unread messages count
      const { data: unreadMessages, error: messagesError } = await supabase.rpc(
        "get_user_total_unread_count"
      );

      // Fetch pending seller orders count
      const { count: pendingOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "pending");

      if (messagesError) {
        console.error("Error fetching unread messages count:", messagesError);
      }
      if (ordersError) {
        console.error("Error fetching pending orders count:", ordersError);
      }

      const messagesCount = messagesError ? 0 : unreadMessages || 0;
      const ordersCount = ordersError ? 0 : pendingOrders || 0;

      setTotalUnreadCount(messagesCount + ordersCount);
    } catch (error) {
      console.error("Error fetching total unread count:", error);
      setTotalUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchTotalUnreadCount();

    // Subscribe to real-time updates for unread messages
    const messagesChannel = supabase
      .channel("account-unread-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_conversation_unread",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTotalUnreadCount();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for pending orders
    const ordersChannel = supabase
      .channel("account-pending-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          fetchTotalUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user, fetchTotalUnreadCount]);

  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "person" : "person-outline"}
        size={27}
        color={color}
      />
      {totalUnreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            backgroundColor: "#FF3B30",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 2,
            borderColor: "white",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const activeTintColor = "#0A84FF";
  const inactiveTintColor = isDarkMode ? "#fff" : "gray";
  const tabBarBackgroundColor = isDarkMode ? "#000000" : "#ffffff";
  const tabBarBorderColor = isDarkMode ? "#1C1C1E" : "#eee";
  const baseIconSize = 27;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused: iconFocused }) => {
          let iconName: string;
          if (route.name === "index") {
            iconName = iconFocused ? "home" : "home-outline";
          } else if (route.name === "search") {
            iconName = iconFocused ? "search" : "search-outline";
          } else if (route.name === "cart") {
            // Use custom cart icon with badge
            return <CartIconWithBadge color={color} focused={iconFocused} />;
          } else if (route.name === "sell") {
            iconName = iconFocused ? "pricetag" : "pricetag-outline";
          } else if (route.name === "account") {
            // Use custom account icon with badge
            return <AccountIconWithBadge color={color} focused={iconFocused} />;
          } else {
            iconName = "help-circle-outline";
          }
          return (
            <Ionicons
              name={iconName as any}
              size={baseIconSize}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopColor: tabBarBorderColor,
          minHeight: 60,
          paddingTop: 4,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          overflow: "visible",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "bold",
          marginBottom: 6,
        },
        tabBarItemStyle: {
          alignItems: "center",
          justifyContent: "center",
        },
        headerShown: false,
        // Performance optimizations
        lazy: true,
        unmountOnBlur: false,
        freezeOnBlur: true,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Explore" }} />
      <Tabs.Screen name="cart" options={{ title: "Cart" }} />
      <Tabs.Screen name="sell" options={{ title: "Sell" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
