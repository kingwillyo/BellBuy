import { BorderRadius, Spacing, useColors } from "@/constants/Theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

interface OfflineIndicatorProps {
  isOffline: boolean;
  isSlowConnection?: boolean;
  size?: "small" | "medium" | "large";
  style?: any;
}

export function OfflineIndicator({
  isOffline,
  isSlowConnection = false,
  size = "medium",
  style,
}: OfflineIndicatorProps) {
  const colors = useColors();

  const getSize = () => {
    switch (size) {
      case "small":
        return 12;
      case "large":
        return 20;
      default:
        return 16;
    }
  };

  const getIconName = () => {
    if (isOffline) return "wifi-outline";
    if (isSlowConnection) return "cellular-outline";
    return "wifi";
  };

  const getBackgroundColor = () => {
    if (isOffline) return colors.error;
    if (isSlowConnection) return colors.warning;
    return colors.success;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          width: getSize() + Spacing.sm,
          height: getSize() + Spacing.sm,
          borderRadius: BorderRadius.full,
        },
        style,
      ]}
    >
      <Ionicons name={getIconName()} size={getSize()} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
