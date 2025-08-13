/**
 * Comprehensive design system for the Marketplace app
 * Provides consistent colors, spacing, and typography across light and dark modes
 */

export const Colors = {
  light: {
    // Core colors
    text: "#1A1A1A",
    textSecondary: "#666666",
    textTertiary: "#888888",
    background: "#FFFFFF",
    backgroundSecondary: "#F8F9FA",
    backgroundTertiary: "#F5F5F5",

    // Interactive colors
    tint: "#0A84FF",
    tintSecondary: "#4F8EF7",
    tabIconDefault: "#CCCCCC",
    tabIconSelected: "#0A84FF",

    // Component colors
    cardBackground: "#FFFFFF",
    inputBackground: "#F7F7F7",
    borderColor: "#E5E5E5",
    borderLight: "#F0F0F0",
    divider: "#EEEEEE",

    // Status colors
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    info: "#007AFF",

    // Special colors
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.5)",
    skeletonBase: "#F0F0F0",
    skeletonHighlight: "#F8F8F8",
  },
  dark: {
    // Core colors
    text: "#FFFFFF",
    textSecondary: "#CCCCCC",
    textTertiary: "#999999",
    background: "#000000",
    backgroundSecondary: "#1C1C1E",
    backgroundTertiary: "#2C2C2E",

    // Interactive colors
    tint: "#0A84FF",
    tintSecondary: "#4F8EF7",
    tabIconDefault: "#666666",
    tabIconSelected: "#0A84FF",

    // Component colors
    cardBackground: "#1C1C1E",
    inputBackground: "#2C2C2E",
    borderColor: "#333333",
    borderLight: "#2A2A2A",
    divider: "#333333",

    // Status colors
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
    info: "#64D2FF",

    // Special colors
    shadow: "#000000",
    overlay: "rgba(0, 0, 0, 0.7)",
    skeletonBase: "#2C2C2E",
    skeletonHighlight: "#3A3A3C",
  },
};

// Design tokens for consistent spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48,
};

// Typography scale
export const Typography = {
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    xxxxl: 32,
    xxxxxl: 36,
  },
  // Font weights
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Border radius scale
export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
