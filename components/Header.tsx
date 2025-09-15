import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";

interface HeaderProps {
  title?: string;
  style?: ViewStyle;
  showBackButton?: boolean;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  style,
  showBackButton,
  children,
}) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor(
    { light: "#EEE", dark: "#333" },
    "background"
  );
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "android" ? insets.top : 0 },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        {showBackButton && (
          <Pressable
            onPress={() => router.back()}
            style={{ marginRight: 8, padding: 4 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={BLUE} />
          </Pressable>
        )}
        {children ? (
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            {children}
          </View>
        ) : (
          <ThemedText
            style={{ fontSize: 20, fontWeight: "bold", color: textColor }}
          >
            {title || ""}
          </ThemedText>
        )}
      </View>
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
    marginLeft: 8,
    marginBottom: 18,
  },
  divider: {
    height: 1,
    marginBottom: 8,
    width: "100%",
    alignSelf: "stretch",
  },
  backButton: {
    marginLeft: 16,
    marginRight: 4,
    padding: 8,
  },
});

export default Header;

const BLUE = "#0A84FF";
