import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, View, ViewStyle } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ backgroundColor }, style]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top,
          height: 56 + insets.top,
          backgroundColor,
          zIndex: 10,
        }}
      >
        {showBackButton && (
          <Pressable
            onPress={() => router.back()}
            style={{
              justifyContent: "center",
              alignItems: "center",
              zIndex: 20,
              width: 40,
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            style={{
              fontSize: 22,
              fontWeight: "bold",
              textAlign: "center",
              flex: 1,
              color: textColor,
            }}
          >
            {title || ""}
          </ThemedText>
        )}
        {showBackButton && <View style={{ width: 40 }} />}
      </View>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: "100%",
    alignSelf: "stretch",
  },
});

export default Header;

const BLUE = "#0A84FF";
