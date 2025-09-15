import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SkeletonProductCard } from "@/components/ui/Skeleton";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

// Loading Skeleton Component
const LoadingSkeleton = () => {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          <SkeletonProductCard />
        </View>
      ))}
    </View>
  );
};

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
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const blue = Colors.light.tint || "#0A84FF";

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
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header title={name} showBackButton />
      {loading ? (
        <LoadingSkeleton />
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
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 26,
  },
  skeletonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  skeletonItem: {
    width: "48%",
    marginBottom: 12,
  },
});
