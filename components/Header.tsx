import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";

interface HeaderProps {
  title: string;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({ title, style }) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor(
    { light: "#EEE", dark: "#333" },
    "background"
  );
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <ThemedText type="title" style={[styles.header, { color: textColor }]}>
        {title}
      </ThemedText>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
    // Remove any marginTop or paddingTop here
  },
  divider: {
    height: 1,
    marginBottom: 8,
    width: "100%",
    alignSelf: "stretch",
    // No marginHorizontal or left/right margin
  },
});

export default Header;
