import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const screenWidth = Dimensions.get("window").width;

interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number;
  main_image?: string;
  image_urls?: string[];
}

export default function FlashSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const textColor = useThemeColor({}, "text");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("flash_sale", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data) setProducts(data);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>
          <ThemedText
            type="title"
            style={[styles.headerTitle, { color: textColor }]}
            numberOfLines={1}
          >
            Flash Sale
          </ThemedText>
          <View style={{ width: 26 }} /> {/* Spacer for symmetry */}
        </View>
        <View style={styles.headerDivider} />
        {loading ? (
          <ThemedText>Loading...</ThemedText>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => (
              <View style={styles.productItem}>
                <ProductCard
                  product={{
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    image:
                      (item.main_image &&
                        typeof item.main_image === "string" &&
                        item.main_image) ||
                      (item.image_urls && item.image_urls[0]) ||
                      "https://via.placeholder.com/160x160?text=No+Image",
                  }}
                />
              </View>
            )}
            columnWrapperStyle={styles.row}
            contentContainerStyle={
              products.length === 0
                ? styles.emptyContainer
                : [
                    styles.gridContainer,
                    { paddingHorizontal: Math.round(screenWidth * 0.04) },
                  ]
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText>No flash sale products found.</ThemedText>
              </View>
            }
          />
        )}
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
    fontSize: 22,
    color: "#fff",
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#222",
    opacity: 0.15,
    marginBottom: 8,
  },
});
