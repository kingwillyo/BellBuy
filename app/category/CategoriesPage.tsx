import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const categories = [
  "Electronics & Gadgets",
  "Fashion & Clothing",
  "Shoes & Accessories",
  "Books & Study Materials",
  "Food & Snacks",
  "Sports & Fitness",
  "Furniture & Hostel Essentials",
  "Laptops & Accessories",
  "Headphones & Audio",
  "Daily Essentials",
  "Beauty & Personal Care",
  "Phones & Tablets",
  "Watches & Jewelry",
  "Gaming & Entertainment",
  "Stationery & Office Supplies",
  "Bags & Backpacks",
  "Musical Instruments",
  "Health & Wellness",
  "Appliances",
  "Services",
];

const icons = [
  "phone-portrait-outline",
  "shirt-outline",
  "footsteps-outline",
  "book-outline",
  "fast-food-outline",
  "basketball-outline",
  "bed-outline",
  "laptop-outline",
  "headset-outline",
  "cart-outline",
  "color-palette-outline",
  "tablet-portrait-outline",
  "watch-outline",
  "game-controller-outline",
  "document-text-outline",
  "briefcase-outline",
  "musical-notes-outline",
  "heart-outline",
  "tv-outline",
  "construct-outline",
];

export default function CategoriesPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  // Use your app's blue color for icons in light mode, white in dark mode
  const blue = Colors.light.tint || "#0A84FF";
  const iconColor = isDarkMode ? "#fff" : blue;
  const backButtonColor = blue;
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View
          style={[
            styles.headerRow,
            { paddingTop: Platform.OS === "android" ? insets.top + 16 : 16 },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={1}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={26} color={backButtonColor} />
          </TouchableOpacity>
          <ThemedText
            type="title"
            style={[styles.headerTitle, { color: textColor }]}
            numberOfLines={1}
          >
            Categories
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {categories.map((cat, idx) => (
            <Pressable
              key={cat}
              style={styles.categoryItem}
              onPress={() =>
                router.push({
                  pathname: "/category/[name]",
                  params: { name: cat },
                })
              }
            >
              <Ionicons
                name={icons[idx] as any}
                size={24}
                color={iconColor}
                style={styles.icon}
              />
              <ThemedText style={[styles.categoryName, { color: textColor }]}>
                {cat}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  headerBack: {
    width: 26,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 26,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 2,
  },
  icon: {
    marginRight: 16,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
  },
});
