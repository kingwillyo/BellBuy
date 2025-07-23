/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const options = [
  { key: "profile", label: "Profile", icon: "person-outline" },
  { key: "order", label: "Order", icon: "bag-outline" },
  { key: "address", label: "Address", icon: "location-outline" },
  { key: "payment", label: "Payment", icon: "card-outline" },
  { key: "my-products", label: "My Products", icon: "pricetag-outline" },
  { key: "seller-orders", label: "Seller Orders", icon: "list-outline" },
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
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const borderColor = useThemeColor(
    { light: "#EEE", dark: "#333" },
    "background"
  );
  const iconColor = accent;
  const inactiveIconColor = useThemeColor(
    { light: "#8E8E93", dark: "#8E8E93" },
    "icon"
  );
  const highlightColor = useThemeColor(
    { light: "#F5F9FF", dark: "#23262F" },
    "background"
  );
  const insets = useSafeAreaInsets();

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
    else if (key === "order") router.push("/account/orders");
    else if (key === "address") router.push("/account/address");
    else if (key === "payment") router.push("/account/payment");
    else if (key === "my-products") router.push("/account/my-products");
    else if (key === "seller-orders") router.push("/account/seller-orders");
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText
        type="title"
        style={[styles.header, { color: textColor, paddingTop: insets.top }]}
      >
        Account
      </ThemedText>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      <View style={styles.optionsList}>
        {options.map((opt) => {
          const isPressed = opt.key === pressed;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionRow,
                isPressed && { backgroundColor: highlightColor },
              ]}
              activeOpacity={0.8}
              onPress={() => handlePress(opt.key)}
            >
              <Ionicons
                name={opt.icon as any}
                size={24}
                color={iconColor}
                style={styles.optionIcon}
              />
              <ThemedText style={[styles.optionLabel, { color: textColor }]}>
                {opt.label}
              </ThemedText>
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
    paddingTop: 0, // Remove extra top padding
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
    // Remove any marginTop or paddingTop here
  },
  divider: {
    height: 1,
    marginBottom: 8,
    marginHorizontal: 0,
  },
  optionsList: {
    marginTop: 0,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 2,
  },
  optionIcon: {
    marginRight: 18,
  },
  optionLabel: {
    fontSize: 17,
  },
});
