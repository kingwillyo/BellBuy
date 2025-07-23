import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

// Dummy product list with categories
const dummyProducts = [
  {
    id: "1",
    name: "FS - Nike Air Max 270 React...",
    price: 299.43,
    discount: 24,
    image: "https://source.unsplash.com/random/160x160/?sneakers",
    category: "Man Shirt",
  },
  {
    id: "2",
    name: "FS - QUILTED MAXI CROSS BAG",
    price: 299.43,
    discount: 24,
    image: "https://source.unsplash.com/random/160x160/?bag",
    category: "Woman Bag",
  },
  {
    id: "3",
    name: "FS - Classic Leather Boots",
    price: 150.0,
    discount: 15,
    image: "https://source.unsplash.com/random/160x160/?boots",
    category: "Man Shoes",
  },
  {
    id: "4",
    name: "Elegant Summer Dress",
    price: 60.0,
    discount: 30,
    image: "https://source.unsplash.com/random/160x160/?dress",
    category: "Dress",
  },
  {
    id: "5",
    name: "Casual Denim Shirt",
    price: 45.0,
    discount: 40,
    image: "https://source.unsplash.com/random/160x160/?shirt",
    category: "Man Shirt",
  },
  {
    id: "6",
    name: "Formal Black Suit",
    price: 299.99,
    discount: 33,
    image: "https://source.unsplash.com/random/160x160/?suit",
    category: "Man Work Equipment",
  },
];

export default function CategoryPage() {
  const params = useLocalSearchParams();
  const name =
    typeof params.name === "string"
      ? params.name
      : Array.isArray(params.name)
      ? params.name[0]
      : "";
  const router = useRouter();
  const filteredProducts = dummyProducts.filter(
    (product) => product.category === name
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <Ionicons
            name="arrow-back"
            size={26}
            style={styles.headerBack}
            onPress={() => router.back()}
          />
          <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>
            {name}
          </ThemedText>
          <View style={{ width: 26 }} /> {/* Spacer for symmetry */}
        </View>
        <View style={styles.headerDivider} />
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <ProductCard product={item} />
            </View>
          )}
          columnWrapperStyle={styles.row}
          contentContainerStyle={
            filteredProducts.length === 0
              ? styles.emptyContainer
              : [
                  styles.gridContainer,
                  { paddingHorizontal: Math.round(screenWidth * 0.04) },
                ]
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText>No products found in this category.</ThemedText>
            </View>
          }
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  gridContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "flex-start",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productItem: {
    width: "48%",
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
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
    color: "#0A84FF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 26,
    color: "#fff",
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#222",
    opacity: 0.15,
    marginBottom: 8,
  },
});
