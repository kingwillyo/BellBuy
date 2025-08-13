// components/CartItem.tsx
import { ThemedText } from "@/components/ThemedText"; // Adjust path if necessary
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

interface CartItemProps {
  item: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    productId: string;
    isSuperFlashSale?: boolean;
    originalPrice?: number;
  };
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  onDeleteItem: (productId: string) => void;
  // onFavoriteToggle?: (id: string) => void; // Optional if you want to implement favorite
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  increaseQuantity,
  decreaseQuantity,
  onDeleteItem,
}) => {
  const cardBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const priceColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "text"
  );
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#fff" : "#666";
  const [imageError, setImageError] = useState(false);
  const fallbackImage = "https://via.placeholder.com/80x80?text=No+Image";
  // Use themed background
  return (
    <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
      <Image
        source={{
          uri: imageError || !item.imageUrl ? fallbackImage : item.imageUrl,
        }}
        style={styles.productImage}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
      <View style={styles.detailsContainer}>
        <ThemedText
          style={[styles.productName, { color: textColor }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </ThemedText>
        {item.isSuperFlashSale && (
          <ThemedText style={[styles.flashSaleLabel, { color: "#FF3B30" }]}>
            🔥 Super Flash Sale
          </ThemedText>
        )}
        <View style={styles.priceContainer}>
          {item.isSuperFlashSale && item.originalPrice && (
            <ThemedText style={[styles.originalPrice, { color: "#8E8E93" }]}>
              ₦{Math.round(item.originalPrice).toLocaleString()}
            </ThemedText>
          )}
          <ThemedText style={[styles.productPrice, { color: priceColor }]}>
            ₦{Math.round((item.price || 0) * item.quantity).toLocaleString()}
          </ThemedText>
        </View>
      </View>
      <View style={styles.rightContainer}>
        <TouchableOpacity
          onPress={() => onDeleteItem(item.productId)}
          style={styles.deleteButton}
        >
          <Ionicons name="close-circle" size={22} color="#FF3B30" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            onPress={() => decreaseQuantity(item.productId)}
            style={styles.quantityButton}
          >
            <ThemedText style={styles.quantityButtonText}>-</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
          <TouchableOpacity
            onPress={() => increaseQuantity(item.productId)}
            style={styles.quantityButton}
          >
            <ThemedText style={styles.quantityButtonText}>+</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    // backgroundColor: "#FFF", // Remove hardcoded color
    borderRadius: 0,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: "cover",
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "space-between",
    minWidth: 0,
    flexShrink: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
  flashSaleLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0", // Light grey background for quantity buttons
    borderRadius: 5,
    width: 100, // Fixed width for quantity section
    minWidth: 80,
    flexShrink: 1,
  },
  quantityButton: {
    padding: 5,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  quantityText: {
    fontSize: 16,
    marginHorizontal: 5,
    color: "#333",
    minWidth: 20,
    textAlign: "center",
  },
  actionsContainer: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingLeft: 10,
  },
  actionIcon: {
    padding: 5,
  },
  rightContainer: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: 80,
  },
  deleteButton: {
    padding: 5,
    marginBottom: 8,
  },
});

export default CartItem;
