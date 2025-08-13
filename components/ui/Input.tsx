import { BorderRadius, Spacing, Typography } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ThemedText } from "../ThemedText";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: "default" | "filled" | "outline";
  size?: "small" | "medium" | "large";
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = "filled",
  size = "medium",
  containerStyle,
  showPasswordToggle = false,
  secureTextEntry,
  style,
  ...props
}: InputProps) {
  const colors = useColors();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.md,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
    };

    // Size variants
    switch (size) {
      case "small":
        baseStyle.paddingHorizontal = Spacing.md;
        baseStyle.paddingVertical = Spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case "large":
        baseStyle.paddingHorizontal = Spacing.xl;
        baseStyle.paddingVertical = Spacing.lg;
        baseStyle.minHeight = 52;
        break;
      default: // medium
        baseStyle.paddingHorizontal = Spacing.lg;
        baseStyle.paddingVertical = Spacing.md;
        baseStyle.minHeight = 44;
    }

    // Variant styles
    switch (variant) {
      case "outline":
        baseStyle.backgroundColor = "transparent";
        baseStyle.borderColor = isFocused ? colors.tint : colors.borderColor;
        break;
      case "filled":
        baseStyle.backgroundColor = colors.inputBackground;
        baseStyle.borderColor = isFocused ? colors.tint : colors.borderColor;
        break;
      default:
        baseStyle.backgroundColor = colors.inputBackground;
        baseStyle.borderColor = colors.borderColor;
    }

    // Error state
    if (error) {
      baseStyle.borderColor = colors.error;
    }

    return baseStyle;
  };

  const getIconColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.tint;
    return colors.textSecondary;
  };

  return (
    <View style={containerStyle}>
      {label && (
        <ThemedText type="caption" variant="secondary" style={styles.label}>
          {label}
        </ThemedText>
      )}

      <View style={[getContainerStyle(), style]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={getIconColor()}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize:
                size === "small" ? Typography.sizes.sm : Typography.sizes.md,
            },
          ]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showPasswordToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !showPasswordToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={20} color={getIconColor()} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <ThemedText
          type="caption"
          style={[styles.errorText, { color: colors.error }]}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
  },
  leftIcon: {
    marginRight: Spacing.md,
  },
  rightIcon: {
    marginLeft: Spacing.md,
  },
  errorText: {
    marginTop: Spacing.xs,
  },
});
