import { BorderRadius, Shadows, Spacing } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { ThemedText } from "../ThemedText";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}: ButtonProps) {
  const colors = useColors();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: BorderRadius.md,
      ...Shadows.sm,
    };

    // Size variants
    switch (size) {
      case "small":
        baseStyle.paddingHorizontal = Spacing.md;
        baseStyle.paddingVertical = Spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case "large":
        baseStyle.paddingHorizontal = Spacing.xxl;
        baseStyle.paddingVertical = Spacing.lg;
        baseStyle.minHeight = 52;
        break;
      default: // medium
        baseStyle.paddingHorizontal = Spacing.xl;
        baseStyle.paddingVertical = Spacing.md;
        baseStyle.minHeight = 44;
    }

    // Color variants
    switch (variant) {
      case "secondary":
        baseStyle.backgroundColor = colors.backgroundSecondary;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.borderColor;
        break;
      case "outline":
        baseStyle.backgroundColor = "transparent";
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.tint;
        break;
      case "ghost":
        baseStyle.backgroundColor = "transparent";
        baseStyle.shadowOpacity = 0;
        baseStyle.elevation = 0;
        break;
      case "danger":
        baseStyle.backgroundColor = colors.error;
        break;
      default: // primary
        baseStyle.backgroundColor = colors.tint;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextColor = (): string => {
    switch (variant) {
      case "secondary":
        return colors.text;
      case "outline":
        return colors.tint;
      case "ghost":
        return colors.tint;
      case "danger":
        return "#FFFFFF";
      default: // primary
        return "#FFFFFF";
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {leftIcon && !loading && (
        <React.Fragment>
          {leftIcon}
          <ThemedText style={{ width: Spacing.sm }} />
        </React.Fragment>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <ThemedText
          type="button"
          style={[{ color: getTextColor() }, textStyle]}
        >
          {title}
        </ThemedText>
      )}

      {rightIcon && !loading && (
        <React.Fragment>
          <ThemedText style={{ width: Spacing.sm }} />
          {rightIcon}
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Additional styles if needed
});
