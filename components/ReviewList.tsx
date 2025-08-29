import { useThemeColor } from "@/hooks/useThemeColor";
import { ProductReview } from "@/types/review";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StarRating } from "./StarRating";

interface ReviewListProps {
  reviews: ProductReview[];
}

export const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [withImages, setWithImages] = useState(false);
  const [sort, setSort] = useState<"recent" | "helpful">("recent");

  // Theme-aware colors
  const cardBg = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E7EDF3", dark: "#2E2E32" },
    "borderColor"
  );
  const textMuted = useThemeColor(
    { light: "#475569", dark: "#94A3B8" },
    "textTertiary"
  );
  const chipBg = useThemeColor(
    { light: "#F2F4F7", dark: "#2A2A2E" },
    "background"
  );
  const chipText = useThemeColor({ light: "#334155", dark: "#CBD5E1" }, "text");
  const textPrimary = useThemeColor({}, "text");

  const filtered = reviews
    .filter((r) => (filterRating ? r.rating === filterRating : true))
    .filter((r) => (withImages ? r.images && r.images.length > 0 : true))
    .sort((a, b) => {
      if (sort === "recent") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      // For demo, just return as is for "helpful"
      return 0;
    });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroller}
      >
        <TouchableOpacity
          style={[styles.chip, filterRating === null && styles.chipActive]}
          onPress={() => setFilterRating(null)}
        >
          <Text
            style={[
              styles.chipText,
              filterRating === null && styles.chipTextActive,
            ]}
          >
            All Review
          </Text>
        </TouchableOpacity>
        {[5, 4, 3, 2, 1].map((star) => (
          <TouchableOpacity
            key={star}
            style={[styles.chip, filterRating === star && styles.chipActive]}
            onPress={() => setFilterRating(filterRating === star ? null : star)}
          >
            <Text
              style={[
                styles.chipText,
                filterRating === star && styles.chipTextActive,
              ]}
            >
              {star}★
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.chip, withImages && styles.chipActive]}
          onPress={() => setWithImages((v) => !v)}
        >
          <Text style={[styles.chipText, withImages && styles.chipTextActive]}>
            With Images
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, sort === "recent" ? null : styles.chipActive]}
          onPress={() => setSort(sort === "recent" ? "helpful" : "recent")}
        >
          <Text
            style={[
              styles.chipText,
              sort === "recent" ? null : styles.chipTextActive,
            ]}
          >
            {sort === "recent" ? "Most Recent" : "Most Helpful"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item: review }) => (
          <View
            style={[
              styles.reviewItem,
              { backgroundColor: cardBg, borderColor },
            ]}
          >
            <View style={styles.reviewerRow}>
              <Image
                source={{ uri: review.user?.avatar_url || undefined }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="disk"
                transition={150}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewerName, { color: textPrimary }]}>
                  {review.user?.full_name || "Verified Buyer"}
                </Text>
                <StarRating rating={review.rating} size={14} disabled />
              </View>
            </View>
            {review.review_text && (
              <Text style={[styles.reviewText, { color: textMuted }]}>
                {review.review_text}
              </Text>
            )}
            {review.images && review.images.length > 0 && (
              <View style={styles.imageRow}>
                {review.images.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: img }}
                    style={styles.reviewImage}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={150}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.dateText, { color: textMuted }]}>
              {new Date(review.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: "#888", marginTop: 32, textAlign: "center" }}>
            No reviews found.
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  filtersScroller: {
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F2F4F7",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#0A84FF",
  },
  chipText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#FFF",
  },
  segment: {
    marginLeft: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#E9EEF7",
  },
  segmentText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 12,
  },
  reviewItem: {
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7EDF3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#EEE",
  },
  reviewerName: {
    fontWeight: "700",
    fontSize: 15,
  },
  reviewText: {
    marginTop: 6,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  reviewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#DDD",
    marginBottom: 8,
  },
  dateText: {
    marginTop: 8,
    color: "#888",
    fontSize: 12,
  },
});
