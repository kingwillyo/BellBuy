import { useBackgroundColor, useThemeColor } from "@/hooks/useThemeColor";
import { View, type ViewProps } from "react-native";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "primary" | "secondary" | "tertiary" | "card";
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  variant = "primary",
  ...otherProps
}: ThemedViewProps) {
  // Use the enhanced background color system
  const defaultBackgroundColor = useBackgroundColor(variant);
  const backgroundColor =
    lightColor || darkColor
      ? useThemeColor({ light: lightColor, dark: darkColor })
      : defaultBackgroundColor;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
