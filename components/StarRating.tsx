import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onChange?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  onChange,
  size = 20,
  disabled = false,
}) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {Array.from({ length: maxStars }).map((_, i) => {
        const filled = i < Math.floor(rating);
        const half = i === Math.floor(rating) && rating % 1 >= 0.5;
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onChange && !disabled && onChange(i + 1)}
            activeOpacity={onChange && !disabled ? 0.7 : 1}
            disabled={disabled || !onChange}
          >
            <Ionicons
              name={filled ? "star" : half ? "star-half" : "star-outline"}
              size={size}
              color="#FFC107"
              style={{ marginRight: 2 }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
