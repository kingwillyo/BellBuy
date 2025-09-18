import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BottomSheet, BottomSheetOption } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useColors, useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { supabase } from "../lib/supabase";

interface Product {
  id: string;
  name: string;
  price: number;
  main_image?: string;
  image_urls?: string[];
  seller?: {
    id: string;
    full_name: string;
    location?: string;
  };
}

interface ReportCategory {
  id: string;
  title: string;
  description: string;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: "prohibited",
    title: "Prohibited items",
    description: "Listings that violates our marketplace guidelines",
  },
  {
    id: "price_gouging",
    title: "Price gouging",
    description:
      "Item price is at a level much higher than is considered reasonable or fair",
  },
  {
    id: "stolen",
    title: "Stolen item",
    description: "Report if you are confident that this item is a stolen item",
  },
  {
    id: "fake",
    title: "Fake or counterfeit",
    description: "Item appears to be fake or counterfeit",
  },
  {
    id: "inappropriate",
    title: "Inappropriate content",
    description: "Item contains inappropriate or offensive content",
  },
  {
    id: "spam",
    title: "Spam or misleading",
    description: "Item appears to be spam or misleading",
  },
];

export default function ReportItemScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ReportCategory | null>(null);
  const [reason, setReason] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Theme colors
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "borderColor");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const backgroundColor = useThemeColor({}, "background");

  useEffect(() => {
    if (!productId) {
      router.back();
      return;
    }
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);

      // Fetch the product details using the productId
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("id, name, price, main_image, image_urls, user_id")
        .eq("id", productId)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load product details",
          visibilityTime: 3000,
          position: "top",
        });
        router.back();
        return;
      }

      if (!productData) {
        Toast.show({
          type: "error",
          text1: "Product Not Found",
          text2: "The product you're trying to report doesn't exist",
          visibilityTime: 3000,
          position: "top",
        });
        router.back();
        return;
      }

      // Fetch seller information separately
      const { data: sellerData, error: sellerError } = await supabase
        .from("profiles")
        .select("id, full_name, location")
        .eq("id", productData.user_id)
        .maybeSingle();

      if (!sellerError && sellerData) {
        setProduct({
          id: productData.id,
          name: productData.name,
          price: productData.price,
          main_image: productData.main_image,
          image_urls: productData.image_urls,
          seller: {
            id: sellerData.id,
            full_name: sellerData.full_name,
            location: sellerData.location,
          },
        });
      } else {
        // Set product without seller info if seller fetch fails
        setProduct({
          id: productData.id,
          name: productData.name,
          price: productData.price,
          main_image: productData.main_image,
          image_urls: productData.image_urls,
        });
      }
    } catch (error) {
      console.error("Error in fetchProduct:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong",
        visibilityTime: 3000,
        position: "top",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: ReportCategory) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Toast.show({
        type: "error",
        text1: "Category Required",
        text2: "Please select a category for your report",
        visibilityTime: 3000,
        position: "top",
      });
      return;
    }

    if (!reason.trim()) {
      Toast.show({
        type: "error",
        text1: "Reason Required",
        text2: "Please provide a reason for your report",
        visibilityTime: 3000,
        position: "top",
      });
      return;
    }

    if (!user) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "Please sign in to submit a report",
        visibilityTime: 3000,
        position: "top",
      });
      return;
    }

    if (!productId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Product ID not found",
        visibilityTime: 3000,
        position: "top",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("reports").insert({
        product_id: productId,
        reporter_id: user.id,
        category: selectedCategory.id,
        reason: reason.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error creating report:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to submit report. Please try again.",
          visibilityTime: 3000,
          position: "top",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Report Submitted",
        text2: "Thank you for your report. We'll review it shortly.",
        visibilityTime: 3000,
        position: "top",
      });

      router.back();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Something went wrong. Please try again.",
        visibilityTime: 3000,
        position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions: BottomSheetOption[] = REPORT_CATEGORIES.map(
    (category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.description,
      icon: "flag-outline",
      onPress: () => handleCategorySelect(category),
    })
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Report Item" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: textSecondary }]}>
            Loading product details...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Report Item" showBackButton />
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.error}
          />
          <ThemedText style={[styles.errorTitle, { color: textColor }]}>
            Product Not Found
          </ThemedText>
          <ThemedText style={[styles.errorMessage, { color: textSecondary }]}>
            The product you're trying to report doesn't exist or has been
            removed.
          </ThemedText>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="primary"
            style={styles.errorButton}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Report Item" showBackButton />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Card */}
          <View
            style={[
              styles.productCard,
              {
                backgroundColor: cardBackground,
                borderColor: borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.productImageContainer,
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <Image
                source={{
                  uri:
                    product.main_image ||
                    product.image_urls?.[0] ||
                    "https://via.placeholder.com/80x80",
                }}
                style={styles.productImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.productInfo}>
              <ThemedText
                style={[styles.productName, { color: textColor }]}
                numberOfLines={2}
              >
                {product.name}
              </ThemedText>
              {product.seller && (
                <View style={styles.sellerInfo}>
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={textSecondary}
                  />
                  <ThemedText
                    style={[styles.sellerLocation, { color: textSecondary }]}
                  >
                    {product.seller.location || "Location not specified"}
                  </ThemedText>
                </View>
              )}
              <View style={styles.priceInfo}>
                <ThemedText
                  style={[styles.priceLabel, { color: textSecondary }]}
                >
                  Selling price
                </ThemedText>
                <ThemedText
                  style={[styles.productPrice, { color: colors.tint }]}
                >
                  ₦{Math.round(product.price).toLocaleString()}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Category Selection */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.sectionLabel, { color: textColor }]}>
              Category
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: selectedCategory ? colors.tint : borderColor,
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <ThemedText
                style={[
                  styles.categoryButtonText,
                  {
                    color: selectedCategory ? textColor : textSecondary,
                  },
                ]}
              >
                {selectedCategory ? selectedCategory.title : "Select category"}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Reason Input */}
          <View style={styles.formSection}>
            <ThemedText style={[styles.sectionLabel, { color: textColor }]}>
              Reason
            </ThemedText>
            <View
              style={[
                styles.reasonInputContainer,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: borderColor,
                },
              ]}
            >
              <TextInput
                placeholder="Please provide details about why you're reporting this item..."
                placeholderTextColor={textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                style={[styles.reasonInput, { color: textColor }]}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* Submit Button - Fixed at bottom */}
        <View style={[styles.submitContainer, { backgroundColor }]}>
          <Button
            title="Submit Report"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !selectedCategory || !reason.trim()}
            variant="primary"
            size="large"
            style={styles.submitButton}
          />
        </View>
      </View>

      {/* Category Selection Modal */}
      <BottomSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Select category"
        options={categoryOptions}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for fixed submit button
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    marginTop: 16,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 16,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 22,
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sellerLocation: {
    fontSize: 14,
    marginLeft: 4,
  },
  priceInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 14,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  formSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 0,
    minHeight: 56,
  },
  categoryButtonText: {
    fontSize: 16,
    flex: 1,
  },
  reasonInputContainer: {
    borderRadius: 12,
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 120,
  },
  reasonInput: {
    fontSize: 16,
    flex: 1,
    minHeight: 88,
  },
  submitContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34, // Account for safe area
  },
  submitButton: {
    width: "100%",
    borderRadius: 12,
  },
});
