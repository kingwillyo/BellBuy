import { ReviewForm } from "@/components/ReviewForm";
import { ReviewList } from "@/components/ReviewList";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProductReviewsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { reviews, loading, error, addReview, fetchReviews } =
    useProductReviews(id!);
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const insets = useSafeAreaInsets();
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({ light: "#222", dark: "#fff" }, "text");

  React.useEffect(() => {
    // Check if user can review (has delivered order and hasn't reviewed yet)
    async function checkEligibility() {
      if (!user || !id) return setCanReview(false);
      // Check for delivered order
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("status", "delivered");
      if (error || !orders || orders.length === 0) return setCanReview(false);
      // Check if already reviewed for any delivered order
      const { data: existing } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", id);
      setCanReview(!existing || existing.length === 0);
    }
    checkEligibility();
  }, [user, id]);

  const handleAddReview = async (data: {
    rating: number;
    review_text?: string;
    images?: string[];
  }) => {
    setSubmitting(true);
    // Find a delivered order for this product
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("product_id", id)
      .limit(1);
    const order_id = orderItems && orderItems[0]?.order_id;
    if (!order_id) {
      Alert.alert("Error", "No delivered order found for this product.");
      setSubmitting(false);
      return;
    }
    const { error } = await addReview({
      product_id: id as string,
      order_id,
      rating: data.rating,
      review_text: data.review_text,
      images: data.images,
    });
    if (error) Alert.alert("Error", error.message);
    else fetchReviews();
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          zIndex: 10,
          height: 56,
          backgroundColor: headerBackgroundColor,
        }}
      >
        <TouchableOpacity
          style={{
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
            width: 40,
          }}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        <ThemedText
          style={{
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
            flex: 1,
            color: textColor,
          }}
        >
          Product Reviews
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      {loading && <ActivityIndicator style={{ marginTop: 32 }} />}
      {error && <Text style={{ color: "red", margin: 16 }}>{error}</Text>}
      <ReviewList reviews={reviews} />
      {canReview && (
        <TouchableOpacity
          style={{
            backgroundColor: "#0A84FF",
            borderRadius: 8,
            paddingVertical: 16,
            alignItems: "center",
            marginHorizontal: 20,
            marginTop: 16,
            marginBottom: insets.bottom + 16,
          }}
          onPress={() => router.push(`/product/${id}/write-review`)}
        >
          <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
            Write Review
          </Text>
        </TouchableOpacity>
      )}
      {canReview === false && (
        <Text style={{ color: "#888", textAlign: "center", margin: 16 }}>
          Only verified buyers who have received this product can leave a
          review.
        </Text>
      )}
    </SafeAreaView>
  );
}
