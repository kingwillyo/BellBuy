import { useThemeColor } from "@/hooks/useThemeColor";
import { ProductReview } from "@/types/review";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StarRating } from "./StarRating";

interface ReviewPreviewProps {
  reviews: ProductReview[];
  averageRating: number;
  totalCount: number;
  onSeeAll?: () => void;
}

export const ReviewPreview: React.FC<ReviewPreviewProps> = ({
  reviews,
  averageRating,
  totalCount,
  onSeeAll,
}) => {
  const cardBg = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "cardBackground"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#2E2E32" },
    "borderColor"
  );
  const textPrimary = useThemeColor({}, "text");
  const textMuted = useThemeColor(
    { light: "#475569", dark: "#94A3B8" },
    "textTertiary"
  );
  return (
    <View style={{ marginTop: 24 }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Reviews</Text>
      </View>
      <View style={styles.ratingRow}>
        <View style={styles.ratingLeft}>
          <StarRating rating={averageRating} size={18} disabled />
          <Text style={styles.ratingText}>
            {averageRating.toFixed(1)} ({totalCount} review
            {totalCount !== 1 ? "s" : ""})
          </Text>
        </View>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>
      {reviews.length > 0 ? (
        reviews.slice(0, 1).map((review) => (
          <View
            key={review.id}
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
                placeholder={require("../assets/images/icon.png")}
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
              <Text
                style={[styles.reviewText, { color: textMuted }]}
                numberOfLines={3}
              >
                {review.review_text}
              </Text>
            )}
            {review.images && review.images.length > 0 && (
              <View style={styles.imageRow}>
                {review.images.slice(0, 3).map((img, idx) => (
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
        ))
      ) : (
        <View
          style={[
            styles.noReviewsContainer,
            { backgroundColor: cardBg, borderColor },
          ]}
        >
          <Text style={[styles.noReviewsText, { color: textMuted }]}>
            No reviews yet
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerText: {
    fontWeight: "600",
    fontSize: 16,
  },
  seeAllText: {
    color: "#0A84FF",
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ratingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 8,
    color: "#888",
    fontSize: 14,
  },
  reviewItem: {
    marginBottom: 16,
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    padding: 12,
  },
  reviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#EEE",
  },
  reviewerName: {
    fontWeight: "700",
    fontSize: 15,
  },
  reviewText: {
    marginTop: 4,
    fontSize: 14,
    color: "#222",
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#DDD",
  },
  dateText: {
    marginTop: 6,
    color: "#888",
    fontSize: 12,
  },
  noReviewsContainer: {
    marginBottom: 16,
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noReviewsText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
});
