/* eslint-disable @typescript-eslint/no-unused-vars */
import { CategoryRow } from "@/components/CategoryRow";
import { FlashSale } from "@/components/FlashSale";
import { HomeHeader } from "@/components/HomeHeader";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanner } from "@/components/PromoBanner";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  main_image?: string;
  image_urls?: string[];
  flash_sale?: boolean;
  created_at?: string;
}

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const name = params.name as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [regularProducts, setRegularProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const backgroundColor = useThemeColor({}, "background");
  const skeletonColor = useThemeColor(
    { light: "#e8e9eb", dark: "#23262F" },
    "background"
  );

  // Remove shuffle and logs/debug for posting products
  // Change sorting so flash_sale products are last
  function sortFlashSaleLast(array: Product[]): Product[] {
    return [...array].sort((a, b) => {
      if (a.flash_sale && !b.flash_sale) return 1;
      if (!a.flash_sale && b.flash_sale) return -1;
      return 0;
    });
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setProducts(data);
        const flashSales = data
          .filter((p) => p.flash_sale === true)
          .slice(0, 10);
        setFlashSaleProducts(flashSales);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to fetch products");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <HomeHeader />
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { backgroundColor }]}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <PromoBanner />
          <CategoryRow />
          {flashSaleProducts.length > 0 && (
            <FlashSale products={flashSaleProducts} />
          )}
          <View style={[styles.productsSection, { backgroundColor }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              All Products
            </ThemedText>
            {products.length === 0 && refreshing === false ? (
              // Show skeleton loader while loading
              <View style={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={styles.skeletonItem}>
                    <View
                      style={[
                        styles.skeletonBox,
                        { backgroundColor: skeletonColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonLine,
                        { backgroundColor: skeletonColor, width: "80%" },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonLine,
                        { backgroundColor: skeletonColor, width: "50%" },
                      ]}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {sortFlashSaleLast(products).map((item) => (
                  <View
                    key={item.id}
                    style={{ width: "48%", marginBottom: 12 }}
                  >
                    <ProductCard
                      product={{
                        id: item.id,
                        name: item.name,
                        price: Math.round(item.price),
                        image:
                          (item.main_image &&
                            typeof item.main_image === "string" &&
                            item.main_image) ||
                          (item.image_urls && item.image_urls[0]) ||
                          fallbackImage,
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
            {products.length === 0 && refreshing === false && (
              <ThemedText
                style={{ textAlign: "center", marginTop: 40, color: "#888" }}
              >
                No products found.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  productsSection: {
    paddingHorizontal: Math.round(screenWidth * 0.04),
    paddingTop: 20,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    justifyContent: "flex-start",
  },
  productItem: {
    width: "48%",
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    justifyContent: "flex-start",
  },
  skeletonItem: {
    width: "48%",
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  skeletonBox: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    marginBottom: 6,
  },
});
