import { BorderRadius, Spacing } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  animate?: boolean;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = BorderRadius.xs,
  style,
  animate = true,
}: SkeletonProps) {
  const colors = useColors();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      const shimmer = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(shimmerAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );

      shimmer.start();

      return () => shimmer.stop();
    }
  }, [animate, shimmerAnimation]);

  const animatedBackgroundColor = animate
    ? shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.skeletonBase, colors.skeletonHighlight],
      })
    : colors.skeletonBase;

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: animatedBackgroundColor,
        },
        style,
      ]}
    />
  );
}

// Predefined skeleton components
export function SkeletonProductCard() {
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = (screenWidth - Spacing.lg * 3) / 2; // Account for padding and gap

  return (
    <View style={[styles.productCard, { width: cardWidth }]}>
      <Skeleton
        height={cardWidth}
        borderRadius={BorderRadius.lg}
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Skeleton width="80%" height={16} style={styles.productTitle} />
        <Skeleton width="60%" height={14} style={styles.productPrice} />
      </View>
    </View>
  );
}

export function SkeletonText({
  lines = 1,
  spacing = Spacing.xs,
}: {
  lines: number;
  spacing?: number;
}) {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "70%" : "100%"}
          height={16}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
}

export function SkeletonButton({
  width = "100%",
  height = 44,
}: {
  width?: number | string;
  height?: number;
}) {
  return (
    <Skeleton width={width} height={height} borderRadius={BorderRadius.md} />
  );
}

const styles = StyleSheet.create({
  productCard: {
    marginBottom: Spacing.md,
  },
  productImage: {
    aspectRatio: 1,
    marginBottom: Spacing.sm,
  },
  productInfo: {
    paddingHorizontal: Spacing.sm,
  },
  productTitle: {
    marginBottom: Spacing.xs,
  },
  productPrice: {
    marginBottom: 0,
  },
});
