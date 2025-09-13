import { LoadingScreen } from "@/components/LoadingScreen";
import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function CategoryPage() {
  const params = useLocalSearchParams();
  const name =
    typeof params.name === "string"
      ? params.name
      : Array.isArray(params.name)
        ? params.name[0]
        : "";
  const router = useRouter();
  const [products, setProducts] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const { universityId } = useUserUniversity();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);

      const query = universityId
        ? supabase
            .from("products")
            .select("*")
            .eq("category", name)
            .eq("university_id", universityId)
        : supabase.from("products").select("*").eq("category", name);

      const { data, error } = await query;
      if (!error && data) {
        setProducts(data);
      } else {
        setProducts([]);
      }
      setLoading(false);
    }
    fetchProducts();
  }, [name, universityId]);

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
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.headerDivider} />
        {loading ? (
          <LoadingScreen />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item: { id: string | number }) =>
              item?.id ? item.id.toString() : Math.random().toString()
            }
            numColumns={2}
            renderItem={({ item }) => {
              if (!item) return null;
              const productWithImage = {
                ...item,
                image:
                  (item as any).main_image ||
                  (Array.isArray((item as any).image_urls)
                    ? (item as any).image_urls[0]
                    : ""),
              };
              return (
                <View style={styles.productItem}>
                  <ProductCard
                    product={{
                      ...productWithImage,
                      name: productWithImage.name || "",
                      price:
                        typeof productWithImage.price === "number"
                          ? productWithImage.price
                          : 0,
                    }}
                  />
                </View>
              );
            }}
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
                <ThemedText style={{ textAlign: "center" }}>
                  No products found in this category.
                </ThemedText>
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
