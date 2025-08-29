import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StarRating } from "./StarRating";

interface ReviewFormProps {
  onSubmit: (data: {
    rating: number;
    review_text?: string;
    images?: string[];
  }) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  loading,
  disabled,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Placeholder for image picker logic
  const handleAddImage = async () => {
    // TODO: Integrate with expo-image-picker or similar
    // For now, just a placeholder
    alert("Image picker not implemented");
  };

  const handleSubmit = () => {
    if (rating < 1) return;
    onSubmit({ rating, review_text: reviewText, images });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Rating</Text>
      <StarRating
        rating={rating}
        onChange={setRating}
        size={28}
        disabled={disabled}
      />
      <TextInput
        style={styles.input}
        placeholder="Write your review (optional)"
        value={reviewText}
        onChangeText={setReviewText}
        editable={!disabled}
        multiline
        numberOfLines={3}
      />
      <View style={styles.imageRow}>
        {images.map((img, idx) => (
          <Image key={idx} source={{ uri: img }} style={styles.image} />
        ))}
        {!disabled && (
          <TouchableOpacity style={styles.addImageBtn} onPress={handleAddImage}>
            <Text style={{ color: "#0A84FF", fontWeight: "600" }}>
              + Add Image
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, (disabled || rating < 1) && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={disabled || rating < 1 || loading}
      >
        <Text style={styles.submitBtnText}>
          {loading ? "Submitting..." : "Submit Review"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    fontSize: 15,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: "#F7F7F7",
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#DDD",
  },
  addImageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#F0F4FF",
    borderWidth: 1,
    borderColor: "#0A84FF",
  },
  submitBtn: {
    backgroundColor: "#0A84FF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
