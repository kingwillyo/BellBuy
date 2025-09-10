/* eslint-disable @typescript-eslint/no-unused-vars */
import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase, uploadMultipleImages } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const categories = [
  { id: "1", name: "Electronics & Gadgets" },
  { id: "2", name: "Fashion & Clothing" },
  { id: "3", name: "Shoes & Accessories" },
  { id: "4", name: "Books & Study Materials" },
  { id: "5", name: "Food & Snacks" },
  { id: "6", name: "Sports & Fitness" },
  { id: "7", name: "Furniture & Hostel Essentials" },
  { id: "8", name: "Laptops & Accessories" },
  { id: "9", name: "Headphones & Audio" },
  { id: "10", name: "Daily Essentials" },
  { id: "11", name: "Beauty & Personal Care" },
  { id: "12", name: "Phones & Tablets" },
  { id: "13", name: "Watches & Jewelry" },
  { id: "14", name: "Gaming & Entertainment" },
  { id: "15", name: "Stationery & Office Supplies" },
  { id: "16", name: "Bags & Backpacks" },
  { id: "17", name: "Musical Instruments" },
  { id: "18", name: "Health & Wellness" },
  { id: "19", name: "Appliances" },
  { id: "20", name: "Services" }
];
const MAX_IMAGES = 5;
const { width } = Dimensions.get("window");

export default function SellScreen() {
  const { user, isLoading } = useAuth();
  // Check flash sale count on mount and when toggling (must be before any early return)
  const [flashSaleCount, setFlashSaleCount] = useState<number | null>(null);
  const [checkingFlashSale, setCheckingFlashSale] = useState(false);
  const FLASH_SALE_LIMIT = 3;
  useEffect(() => {
    if (user) {
      (async () => {
        setCheckingFlashSale(true);
        const { data: flashSales, error } = await supabase
          .from("products")
          .select("id")
          .eq("user_id", user.id)
          .eq("flash_sale", true);
        if (!error && flashSales) {
          setFlashSaleCount(flashSales.length);
        }
        setCheckingFlashSale(false);
      })();
    }
  }, [user]);
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [description, setDescription] = useState("");
  const [flashSale, setFlashSale] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);
  if (!isLoading && !user) {
    return null;
  }
  if (!user) return null;
  const isDarkMode = colorScheme === "dark";

  const textColor = isDarkMode ? Colors.dark.text : Colors.light.text;
  const backgroundColor = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;
  const cardBackgroundColor = isDarkMode ? "#151718" : "#fff";
  const borderColor = isDarkMode ? "#333" : "#EEE";
  const accent = "#0A84FF";
  const secondary = isDarkMode ? "#23262F" : "#F0F0F0";
  const placeholderColor = isDarkMode ? "#AAA" : "#888";

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(
        "Limit reached",
        `You can only upload up to ${MAX_IMAGES} images.`
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      // The following options are only valid on web, so we add them conditionally
      ...(Platform.OS === "web"
        ? {
            selectionLimit: MAX_IMAGES - images.length,
            multiple: true,
          }
        : {}),
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets
        .map((a) => a.uri)
        .slice(0, MAX_IMAGES - images.length);
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  // Drag-and-drop reordering (fallback to up/down if no DraggableFlatList)
  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFlashSaleToggle = async (value: boolean) => {
    if (
      value &&
      flashSaleCount !== null &&
      flashSaleCount >= FLASH_SALE_LIMIT
    ) {
      Alert.alert(
        "Flash Sale Limit Reached",
        `You can only post up to ${FLASH_SALE_LIMIT} flash sale products.`
      );
      return;
    }
    setFlashSale(value);
  };

  const handlePost = async () => {
    console.log("[handlePost] Called");
    console.log("[handlePost] Fields:", {
      name,
      price,
      category,
      description,
      images,
      flashSale,
      user,
    });
    if (
      !name.trim() ||
      !price.trim() ||
      !category.trim() ||
      !description.trim() ||
      images.length === 0
    ) {
      console.log("[handlePost] Missing fields");
      Alert.alert(
        "Missing fields",
        "Please fill in all fields and upload at least one image."
      );
      return;
    }
    // Check flash sale limit before posting
    if (
      flashSale &&
      flashSaleCount !== null &&
      flashSaleCount >= FLASH_SALE_LIMIT
    ) {
      Alert.alert(
        "Flash Sale Limit Reached",
        `You can only post up to ${FLASH_SALE_LIMIT} flash sale products.`
      );
      return;
    }
    setLoading(true);
    try {
      // 1. Upload images to Supabase Storage
      console.log("[handlePost] Uploading images for user:", user?.id);
      const imageUrls = await uploadMultipleImages(images, user.id);
      console.log("[handlePost] Uploaded image URLs:", imageUrls);
      // 2. Insert product row into Supabase
      const { error } = await supabase.from("products").insert({
        user_id: user.id,
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        category: category.trim(),
        flash_sale: flashSale,
        image_urls: imageUrls,
        main_image: imageUrls[0],
      });
      if (error) {
        console.log("[handlePost] Supabase insert error:", error);
        throw error;
      }
      // 3. Success UX
      console.log("[handlePost] Product posted successfully!");
      Alert.alert("Success", "Product posted successfully!");
      setImages([]);
      setName("");
      setPrice("");
      setCategory(categories[0].name);
      setDescription("");
      setFlashSale(false);
    } catch (err: any) {
      console.log("[handlePost] Error:", err);
      Alert.alert("Error", err.message || "Failed to post product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Header title="Sell a Product" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Picker */}
          <View style={styles.imagePickerRow}>
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: secondary }]}
              onPress={pickImage}
              activeOpacity={0.8}
              disabled={images.length >= MAX_IMAGES}
            >
              <ThemedText
                style={[styles.imagePickerText, { color: placeholderColor }]}
              >
                +{images.length === 0 ? " Add Images" : " Add More"}
              </ThemedText>
            </TouchableOpacity>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageThumbsRow}
            >
              {images.map((item, index) => (
                <View style={styles.imageThumbWrapper} key={item + index}>
                  <Image source={{ uri: item }} style={styles.imageThumb} />
                  <View style={styles.imageThumbActions}>
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(index)}
                    >
                      <ThemedText style={styles.removeImageText}>×</ThemedText>
                    </TouchableOpacity>
                    <View style={styles.imageMoveBtns}>
                      <TouchableOpacity
                        onPress={() => moveImage(index, index - 1)}
                        disabled={index === 0}
                        style={[
                          styles.moveBtn,
                          index === 0 && { opacity: 0.3 },
                        ]}
                      >
                        <ThemedText style={styles.moveBtnText}>↑</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveImage(index, index + 1)}
                        disabled={index === images.length - 1}
                        style={[
                          styles.moveBtn,
                          index === images.length - 1 && { opacity: 0.3 },
                        ]}
                      >
                        <ThemedText style={styles.moveBtnText}>↓</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index === 0 && (
                    <ThemedText style={styles.mainImageLabel}>Main</ThemedText>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
          {/* Product Name */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            placeholder="Product Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={placeholderColor}
          />
          {/* Price */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            placeholder="Price (₦)"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholderTextColor={placeholderColor}
          />
          {/* Category */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  { backgroundColor: secondary },
                  category === cat.name && { backgroundColor: accent },
                ]}
                onPress={() => setCategory(cat.name)}
                activeOpacity={0.8}
              >
                <ThemedText
                  style={[
                    styles.categoryButtonText,
                    {
                      color: category === cat.name ? "#FFF" : textColor,
                      fontWeight: category === cat.name ? "bold" : "normal",
                    },
                  ]}
                >
                  {cat.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Description */}
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor={placeholderColor}
          />
          {/* Flash Sale Switch */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: textColor }]}>
              Flash Sale
            </ThemedText>
            <Switch
              value={flashSale}
              onValueChange={handleFlashSaleToggle}
              thumbColor={
                flashSale
                  ? accent
                  : Platform.OS === "android"
                  ? "#f4f3f4"
                  : undefined
              }
              trackColor={{ false: borderColor, true: "#b3d7ff" }}
              disabled={checkingFlashSale}
            />
          </View>
          {/* Flash Sale Limit Message */}
          {flashSaleCount !== null && flashSaleCount >= FLASH_SALE_LIMIT && (
            <View style={{ marginBottom: 12, marginTop: -8 }}>
              <ThemedText
                style={{ color: "#FF3B30", fontWeight: "bold", fontSize: 14 }}
              >
                You’ve reached your Flash Sale limit ({FLASH_SALE_LIMIT} items).
                Remove one to add a new flash sale.
              </ThemedText>
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
        {/* Fixed Post Button */}
        <View
          style={[
            styles.bottomPostButtonContainer,
            {
              backgroundColor: cardBackgroundColor,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              { backgroundColor: accent },
              loading && { opacity: 0.7 },
            ]}
            onPress={handlePost}
            disabled={loading}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.checkoutButtonText}>
              {loading ? "Posting..." : "Post Product"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0, // Remove extra top padding
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 18,
    textAlign: "left",
  },
  divider: {
    height: 1,
    marginBottom: 8,
    marginHorizontal: 0,
  },
  imagePickerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
    gap: 10,
  },
  imagePicker: {
    height: 80,
    width: 80,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 8,
  },
  imagePickerText: {
    fontSize: 15,
    textAlign: "center",
  },
  imageThumbsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  imageThumbWrapper: {
    position: "relative",
    marginRight: 8,
    alignItems: "center",
  },
  imageThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    resizeMode: "cover",
  },
  imageThumbActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 2,
  },
  removeImageBtn: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  removeImageText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    lineHeight: 16,
  },
  imageMoveBtns: {
    flexDirection: "column",
    gap: 0,
    marginLeft: 2,
  },
  moveBtn: {
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  moveBtnText: {
    fontSize: 13,
    color: "#0A84FF",
    fontWeight: "bold",
    lineHeight: 16,
  },
  mainImageLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#0A84FF",
    fontWeight: "bold",
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  switchLabel: {
    fontSize: 16,
  },
  checkoutButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  bottomPostButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
  },
});
