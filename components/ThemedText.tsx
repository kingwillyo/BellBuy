import { Typography } from "@/constants/Colors";
import { useTextColor, useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, Text, type TextProps } from "react-native";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "default"
    | "title"
    | "subtitle"
    | "heading"
    | "body"
    | "caption"
    | "button"
    | "link";
  variant?: "primary" | "secondary" | "tertiary";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  variant = "primary",
  ...rest
}: ThemedTextProps) {
  // Use the enhanced color system
  const defaultColor = useTextColor(variant);
  const color =
    lightColor || darkColor
      ? useThemeColor({ light: lightColor, dark: darkColor })
      : defaultColor;

  // Get the appropriate style based on type
  const getTypeStyle = () => {
    switch (type) {
      case "title":
        return styles.title;
      case "subtitle":
        return styles.subtitle;
      case "heading":
        return styles.heading;
      case "body":
        return styles.body;
      case "caption":
        return styles.caption;
      case "button":
        return styles.button;
      case "link":
        return styles.link;
      default:
        return styles.default;
    }
  };

  return (
    <Text
      style={[{ color }, getTypeStyle(), style].filter(Boolean)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    fontWeight: Typography.weights.regular,
  },
  title: {
    fontSize: Typography.sizes.xxxxl,
    lineHeight: Typography.sizes.xxxxl * Typography.lineHeights.tight,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xl,
    lineHeight: Typography.sizes.xl * Typography.lineHeights.normal,
    fontWeight: Typography.weights.semibold,
  },
  heading: {
    fontSize: Typography.sizes.lg,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
    fontWeight: Typography.weights.semibold,
  },
  body: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.relaxed,
    fontWeight: Typography.weights.regular,
  },
  caption: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * Typography.lineHeights.normal,
    fontWeight: Typography.weights.regular,
  },
  button: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.tight,
    fontWeight: Typography.weights.semibold,
  },
  link: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.normal,
    fontWeight: Typography.weights.medium,
    textDecorationLine: "underline",
  },
});
