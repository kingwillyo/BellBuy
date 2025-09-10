import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_urls: string[];
  main_image: string;
  category: string;
  flash_sale: boolean;
}

export default function MyProductsScreen() {
  const { user, isLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<{ [id: string]: boolean }>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardBackgroundColor = useThemeColor(
    { light: "#FFF", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const priceColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "text"
  );
  const fallbackImage = "https://via.placeholder.com/80x80?text=No+Image";
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const productCardBg = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const backgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      setLoading(true);
      supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setProducts(data as Product[]);
          setLoading(false);
        });
    }, [user])
  );

  if (isLoading || loading)
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StatusBar style="auto" />
        {/* Remove default header in loading state too */}
        <Stack.Screen options={{ headerShown: false }} />
        {/* Custom Header - fixed to top, same as main render */}
        <View
          style={[
            styles.customHeader,
            {
              paddingTop: insets.top,
              height: 56 + insets.top,
              backgroundColor: headerBackgroundColor,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            My Listings
          </ThemedText>
        </View>
        <LoadingScreen />
      </View>
    );
  if (!user) return null;

  // Handler to delete a product
  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(productId);
            const { error } = await supabase
              .from("products")
              .delete()
              .eq("id", productId);
            setDeletingId(null);
            if (!error) {
              setProducts((prev) => prev.filter((p) => p.id !== productId));
            } else {
              Alert.alert(
                "Error",
                error.message || "Failed to delete product."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style="auto" />
      {/* Remove default header */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom Header - fixed to top */}
      <View
        style={[
          styles.customHeader,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: headerBackgroundColor,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          My Listings
        </ThemedText>
      </View>
      {products.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          You haven&apos;t posted any products yet.
        </ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.productsList}>
          {products.map((product) => (
            <View
              style={[styles.productCard, { backgroundColor: productCardBg }]}
              key={product.id}
            >
              <View style={styles.imageWrapper}>
                <Image
                  source={
                    imageErrors[product.id]
                      ? fallbackImage
                      : (product.image_urls && product.image_urls[0]) ||
                        fallbackImage
                  }
                  style={styles.productImage}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                  onError={() =>
                    setImageErrors((prev) => ({ ...prev, [product.id]: true }))
                  }
                />
              </View>
              <View style={styles.detailsContainer}>
                <ThemedText
                  style={[styles.productName, { color: textColor }]}
                  numberOfLines={2}
                >
                  {product.name}
                </ThemedText>
                <ThemedText
                  style={[styles.productPrice, { color: priceColor }]}
                >
                  ₦{product.price.toLocaleString()}
                </ThemedText>
              </View>
              <View style={styles.rightContainer}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProduct(product.id)}
                  disabled={deletingId === product.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color="#FF3B30"
                    style={{ opacity: deletingId === product.id ? 0.5 : 1 }}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() =>
                    router.push(`/account/my-products/${product.id}`)
                  }
                >
                  <Ionicons name="create-outline" size={22} color="#0A84FF" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: undefined, // ThemedView will handle background
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
    color: "#888",
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    marginTop: 16, // Added space below header
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
  },
  imageWrapper: {
    position: "relative",
    marginRight: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: "cover",
    backgroundColor: "#f0f0f0",
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "space-between",
    minWidth: 0,
    flexShrink: 1,
    paddingRight: 10,
  },
  rightContainer: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: 48,
    height: 80,
    paddingVertical: 2,
  },
  editButton: {
    padding: 5,
    marginTop: 8,
  },
  deleteButton: {
    padding: 5,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
  },
  productDesc: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  editButtonBelow: {
    // Remove this style, replaced by editButton
  },
});
