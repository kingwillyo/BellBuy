import {
  BorderRadius,
  Shadows,
  Spacing,
  Typography,
  useColors,
} from "@/constants/Theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { Button } from "./ui/Button";

interface OfflinePlaceholderProps {
  title?: string;
  message?: string;
  showRetryButton?: boolean;
  onRetry?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: any;
}

export function OfflinePlaceholder({
  title = "No Internet Connection",
  message = "Please check your connection and try again.",
  showRetryButton = true,
  onRetry,
  icon = "wifi-outline",
  style,
}: OfflinePlaceholderProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.content, { backgroundColor: colors.cardBackground }]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Ionicons name={icon} size={48} color={colors.textTertiary} />
        </View>

        <ThemedText
          type="subtitle"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </ThemedText>

        <ThemedText
          style={[styles.message, { color: colors.textSecondary }]}
          textAlign="center"
        >
          {message}
        </ThemedText>

        {showRetryButton && onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="outline"
            size="medium"
            style={styles.retryButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: "center",
    padding: Spacing.xxxl,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
    maxWidth: 300,
    width: "100%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 120,
  },
});
