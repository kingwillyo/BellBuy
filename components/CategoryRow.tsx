import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

const screenWidth = Dimensions.get("window").width;

const categories = [
  { id: "1", name: "Electronics & Gadgets", icon: "phone-portrait-outline" },
  { id: "2", name: "Fashion & Clothing", icon: "shirt-outline" },
  { id: "3", name: "Shoes & Accessories", icon: "footsteps-outline" },
  { id: "4", name: "Books & Study Materials", icon: "book-outline" },
  { id: "5", name: "Food & Snacks", icon: "fast-food-outline" },
  { id: "6", name: "Sports & Fitness", icon: "basketball-outline" },
  { id: "7", name: "Furniture & Hostel Essentials", icon: "bed-outline" },
  { id: "8", name: "Laptops & Accessories", icon: "laptop-outline" },
  { id: "9", name: "Headphones & Audio", icon: "headset-outline" },
  { id: "10", name: "Daily Essentials", icon: "cart-outline" }
];

export function CategoryRow() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const iconColorLight = useThemeColor({}, "tint");
  const iconBackgroundColor = useThemeColor(
    { light: "#F5F5F5", dark: "#2A2A2A" },
    "background"
  );

  const iconColor = isDarkMode ? "#fff" : iconColorLight;
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Category</ThemedText>
        <Pressable onPress={() => router.push("/category/CategoriesPage") }>
          <ThemedText style={styles.moreLink}>More Category</ThemedText>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={styles.categoryItem}
            onPress={() =>
              router.push({
                pathname: "/category/[name]",
                params: { name: category.name },
              })
            }
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: iconBackgroundColor },
              ]}
            >
              <Ionicons
                name={category.icon as any}
                size={24}
                color={iconColor}
              />
            </View>
            <ThemedText style={styles.categoryName}>{category.name}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Math.round(screenWidth * 0.04),
    marginBottom: 12,
  },
  moreLink: {
    color: "#0A84FF",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: Math.round(screenWidth * 0.04),
    gap: 12,
  },
  categoryItem: {
    alignItems: "center",
    minWidth: 72,
    flexShrink: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    textAlign: "center",
  },
});
