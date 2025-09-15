import {
  BorderRadius,
  Spacing,
  Typography,
  useColors,
} from "@/constants/Theme";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { Button } from "./ui/Button";

interface OfflineOverlayProps {
  isVisible: boolean;
  message?: string;
  onRetry?: () => void;
  style?: any;
}

export function OfflineOverlay({
  isVisible,
  message = "You're currently offline",
  onRetry,
  style,
}: OfflineOverlayProps) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const { width, height } = Dimensions.get("window");

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          width,
          height,
        },
        style,
      ]}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill} />

      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: colors.cardBackground,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <ThemedText style={[styles.icon, { color: colors.textTertiary }]}>
            📡
          </ThemedText>
        </View>

        <ThemedText
          type="subtitle"
          style={[styles.title, { color: colors.text }]}
        >
          {message}
        </ThemedText>

        <ThemedText
          style={[styles.description, { color: colors.textSecondary }]}
          textAlign="center"
        >
          Check your internet connection and try again
        </ThemedText>

        {onRetry && (
          <Button
            title="Retry"
            onPress={onRetry}
            variant="primary"
            size="medium"
            style={styles.retryButton}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: Spacing.xxxl,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.xl,
    maxWidth: 320,
    width: "100%",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 100,
  },
});
