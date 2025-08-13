/**
 * Centralized theme export for easy imports
 * Import everything you need for theming from this single file
 */

export { useColorScheme } from "../hooks/useColorScheme";
export {
  useBackgroundColor,
  useColors,
  useTextColor,
  useThemeColor,
} from "../hooks/useThemeColor";
export { BorderRadius, Colors, Shadows, Spacing, Typography } from "./Colors";

// Common theme utilities
export const getThemedStyle = (
  lightStyle: any,
  darkStyle: any,
  isDark: boolean
) => {
  return isDark ? darkStyle : lightStyle;
};

// Animation durations for consistent feel
export const AnimationDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Common dimensions
export const Layout = {
  headerHeight: 56,
  tabBarHeight: 72,
  borderWidth: 1,
  borderWidthThick: 2,
};
