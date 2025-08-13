/**
 * Enhanced theme color hook with comprehensive design system support
 * Provides type-safe access to all theme colors
 */

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

// Type for all available color keys
type ColorKeys = keyof typeof Colors.light;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName?: ColorKeys
): string {
  const theme = useColorScheme() ?? "light";

  // If colorName is provided, use it from the design system
  if (colorName && Colors[theme][colorName]) {
    const colorFromProps = props[theme];
    return colorFromProps || Colors[theme][colorName];
  }

  // Fallback to props-based colors
  const colorFromProps = props[theme];
  if (colorFromProps) {
    return colorFromProps;
  }

  // Default fallbacks
  return theme === "dark" ? "#FFFFFF" : "#000000";
}

// Convenience hooks for common color patterns
export function useColors() {
  const theme = useColorScheme() ?? "light";
  return Colors[theme];
}

export function useTextColor(
  variant: "primary" | "secondary" | "tertiary" = "primary"
) {
  const colors = useColors();
  switch (variant) {
    case "secondary":
      return colors.textSecondary;
    case "tertiary":
      return colors.textTertiary;
    default:
      return colors.text;
  }
}

export function useBackgroundColor(
  variant: "primary" | "secondary" | "tertiary" | "card" = "primary"
) {
  const colors = useColors();
  switch (variant) {
    case "secondary":
      return colors.backgroundSecondary;
    case "tertiary":
      return colors.backgroundTertiary;
    case "card":
      return colors.cardBackground;
    default:
      return colors.background;
  }
}
