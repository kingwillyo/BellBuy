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
  { id: "1", name: "Man Shirt", icon: "shirt-outline" },
  { id: "2", name: "Dress", icon: "woman-outline" },
  { id: "3", name: "Man Work Equipment", icon: "briefcase-outline" },
  { id: "4", name: "Woman Bag", icon: "bag-outline" },
  { id: "5", name: "Man Shoes", icon: "footsteps-outline" },
];

export function CategoryRow() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const iconColorLight = useThemeColor({}, "icon");
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
        <Pressable>
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
                pathname: `/category/${category.name}`,
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
