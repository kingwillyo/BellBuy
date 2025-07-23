import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabStyles = StyleSheet.create({
  tabBarStyle: {
    height: Platform.OS === "ios" ? 80 : 60, // Total desired height of the tab bar

    borderTopWidth: 1,
    borderTopColor: "#eee",
    // backgroundColor: '#fff', // Consider setting this explicitly here if your theme background causes issues
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const activeTintColor = "#0A84FF";
  const inactiveTintColor = isDarkMode ? "#fff" : "gray";
  const tabBarBackgroundColor = isDarkMode ? "#1f1f1f" : "#ffffff";
  const tabBarBorderColor = isDarkMode ? "#333" : "#eee";
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
            iconName = iconFocused ? "cart" : "cart-outline";
          } else if (route.name === "sell") {
            iconName = iconFocused ? "pricetag" : "pricetag-outline";
          } else if (route.name === "account") {
            iconName = iconFocused ? "person" : "person-outline";
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
