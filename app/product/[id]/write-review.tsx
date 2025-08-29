import { StarRating } from "@/components/StarRating";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#0A84FF";

export default function WriteReviewPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { addReview, fetchReviews } = useProductReviews(id!);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({ light: "#222", dark: "#fff" }, "text");
  const pageBg = useThemeColor({ light: "#FFF", dark: "#000" }, "background");
  const labelColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor(
    { light: "#B0B7C3", dark: "#94A3B8" },
    "textTertiary"
  );
  const borderColor = useThemeColor({}, "borderColor");
  const inputBg = useThemeColor(
    { light: "#FAFAFA", dark: "#1C1C1E" },
    "inputBackground"
  );

  // Placeholder for image picker
  const handleAddImage = async () => {
    Alert.alert("Image Picker", "Image picker integration goes here.");
  };

  const handleSubmit = async () => {
    if (rating < 1) return;
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
      rating,
      review_text: reviewText,
      images,
    });
    setSubmitting(false);
    if (error) Alert.alert("Error", error.message);
    else {
      fetchReviews();
      router.back();
    }
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
          Write Review
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: pageBg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.header, { color: labelColor }]}>
          Please write Overall level of satisfaction with your shipping /
          Delivery Service
        </Text>
        <View style={styles.starsRow}>
          <StarRating rating={rating} onChange={setRating} size={36} />
          <Text style={[styles.ratingValue, { color: mutedColor }]}>
            {rating}/5
          </Text>
        </View>
        <Text style={[styles.sectionLabel, { color: labelColor }]}>
          Write Your Review
        </Text>
        <TextInput
          style={[
            styles.input,
            { borderColor, backgroundColor: inputBg, color: labelColor },
          ]}
          placeholder="Write your review here"
          value={reviewText}
          onChangeText={setReviewText}
          multiline
          numberOfLines={4}
          placeholderTextColor={mutedColor}
        />
        <Text style={[styles.sectionLabel, { color: labelColor }]}>
          Add Photo
        </Text>
        <View style={styles.imageRow}>
          {images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.image} />
          ))}
          {images.length < 4 && (
            <TouchableOpacity
              style={[
                styles.addImageBtn,
                { borderColor, backgroundColor: pageBg },
              ]}
              onPress={handleAddImage}
            >
              <Text style={styles.plus}>+</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, rating < 1 && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || rating < 1}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? "Submitting..." : "Submit Review"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 18,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  ratingValue: {
    fontWeight: "700",
    fontSize: 18,
    color: "#B0B7C3",
    marginLeft: 8,
  },
  sectionLabel: {
    fontWeight: "700",
    fontSize: 14,
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#EEE",
    marginRight: 8,
  },
  addImageBtn: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontSize: 32,
    color: PRIMARY,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 24,
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
