import {
  BorderRadius,
  Spacing,
  Typography,
  useColors,
} from "@/constants/Theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";

interface OfflineBannerProps {
  isVisible: boolean;
  message?: string;
  onRetry?: () => void;
  style?: any;
}

export function OfflineBanner({
  isVisible,
  message = "You're offline. Some features may be limited.",
  onRetry,
  style,
}: OfflineBannerProps) {
  const colors = useColors();

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.warning,
          borderBottomColor: colors.warning,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name="wifi-outline"
          size={16}
          color="#FFFFFF"
          style={styles.icon}
        />
        <ThemedText
          style={[styles.message, { color: "#FFFFFF" }]}
          numberOfLines={2}
        >
          {message}
        </ThemedText>
        {onRetry && (
          <Ionicons
            name="refresh-outline"
            size={16}
            color="#FFFFFF"
            style={styles.retryIcon}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    ...Spacing.px,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
  },
  retryIcon: {
    marginLeft: Spacing.sm,
  },
});
