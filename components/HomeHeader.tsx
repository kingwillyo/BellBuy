// components/HomeHeader.tsx
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const screenWidth = Dimensions.get("window").width;

export function HomeHeader() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const router = useRouter();

  const headerBackgroundColor = useThemeColor({}, "background");
  const iconColorLight = useThemeColor({}, "text");
  const searchIconColorLight = useThemeColor(
    { light: "#666", dark: "#9BA1A6" },
    "text"
  );
  const searchTextColorLight = useThemeColor(
    { light: "#666", dark: "#9BA1A6" },
    "text"
  );
  const searchBackgroundColor = useThemeColor(
    { light: "#F5F5F5", dark: "#2A2A2A" },
    "background"
  );

  const iconColor = colorScheme === "dark" ? "#fff" : iconColorLight;
  const searchIconColor =
    colorScheme === "dark" ? "#fff" : searchIconColorLight;
  const searchTextColor =
    colorScheme === "dark" ? "#fff" : searchTextColorLight;

  const statusBarStyle = isDarkMode ? "light-content" : "dark-content";

  const handleSearchPress = () => {
    router.push("/(tabs)/search");
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: headerBackgroundColor }]}
    >
      <StatusBar barStyle={statusBarStyle} />

      <ThemedView style={styles.container}>
        <Pressable
          style={({ pressed }) => [
            styles.searchContainer,
            { backgroundColor: searchBackgroundColor },
            pressed && {
              backgroundColor: isDarkMode ? "#3A3A3A" : "#E0E0E0",
            },
          ]}
          onPress={handleSearchPress}
          android_ripple={{
            color: isDarkMode ? "#3A3A3A" : "#D0D0D0",
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="search" size={20} color={searchIconColor} />
          <ThemedText
            style={[styles.searchPlaceholder, { color: searchTextColor }]}
          >
            Search for products
          </ThemedText>
        </Pressable>
        <View style={styles.iconsContainer}>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push("/wishlist")}
          >
            <Ionicons name="heart-outline" size={24} color={iconColor} />
          </Pressable>
          <Pressable style={styles.iconButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={iconColor}
            />
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    // No fixed background color here, it's set dynamically above
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Math.round(screenWidth * 0.04),
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  iconsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    padding: 4,
  },
});
