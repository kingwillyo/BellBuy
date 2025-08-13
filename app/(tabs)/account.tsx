/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const options = [
  { key: "profile", label: "Profile", icon: "person-outline" },
  { key: "order", label: "Orders", icon: "bag-outline" },
  { key: "address", label: "Address", icon: "location-outline" },
  { key: "payment", label: "Payment", icon: "card-outline" },
  { key: "my-products", label: "My Products", icon: "pricetag-outline" },
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
              <Ionicons
                name={opt.icon as any}
                size={24}
                color={colors.tint}
                style={styles.optionIcon}
              />
              <ThemedText style={styles.optionLabel}>{opt.label}</ThemedText>
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
