import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase, uploadMultipleImages } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";

const categories = [
  { id: "1", name: "Man Shirt" },
  { id: "2", name: "Dress" },
  { id: "3", name: "Man Work Equipment" },
  { id: "4", name: "Woman Bag" },
  { id: "5", name: "Man Shoes" },
];
const MAX_IMAGES = 5;
const { width } = Dimensions.get("window");

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [description, setDescription] = useState("");
  const [flashSale, setFlashSale] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#EEE", dark: "#333" },
    "background"
  );
  const accent = "#0A84FF";
  const secondary = useThemeColor(
    { light: "#F0F0F0", dark: "#23262F" },
    "background"
  );
  const placeholderColor = useThemeColor(
    { light: "#888", dark: "#AAA" },
    "text"
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/auth/signin");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setProduct(data);
          setImages(data.image_urls || []);
          setName(data.name || "");
          setPrice(data.price ? String(data.price) : "");
          setCategory(data.category || categories[0].name);
          setDescription(data.description || "");
          setFlashSale(!!data.flash_sale);
          setStockQuantity(
            data.stock_quantity ? String(data.stock_quantity) : "1"
          );
          setInStock(data.in_stock !== undefined ? data.in_stock : true);
        }
        setLoading(false);
      });
  }, [id]);

  // Image picker logic
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

  // Helper to determine which images are new (local uris)
  const isLocalUri = (uri: string) =>
    uri.startsWith("file://") || uri.startsWith("data:");

  // Save changes handler
  const handleSave = async () => {
    if (
      !name.trim() ||
      !price.trim() ||
      !category.trim() ||
      !description.trim() ||
      !stockQuantity.trim() ||
      images.length === 0
    ) {
      Alert.alert(
        "Missing fields",
        "Please fill in all fields and upload at least one image."
      );
      return;
    }

    // Validate stock quantity
    const stockQty = parseInt(stockQuantity);
    if (isNaN(stockQty) || stockQty < 0) {
      Alert.alert(
        "Invalid stock quantity",
        "Please enter a valid stock quantity (0 or more)."
      );
      return;
    }
    setSaving(true);
    try {
      // Upload new images if any
      const newImageUris = images.filter(isLocalUri);
      let uploadedUrls: string[] = [];
      if (newImageUris.length > 0) {
        if (!user) throw new Error("User not found");
        uploadedUrls = await uploadMultipleImages(newImageUris, user.id);
      }
      // Merge uploaded and existing URLs in correct order
      const finalImageUrls = images.map((uri) =>
        isLocalUri(uri) ? uploadedUrls.shift()! : uri
      );
      // Update product in Supabase
      console.log("Updating product with:", {
        id,
        in_stock: inStock,
        stock_quantity: stockQty,
      });

      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          price: parseFloat(price),
          category: category.trim(),
          description: description.trim(),
          flash_sale: flashSale,
          stock_quantity: stockQty,
          in_stock: inStock, // Use the toggle value directly
          image_urls: finalImageUrls,
          main_image: finalImageUrls[0],
        })
        .eq("id", id);

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }
      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Header title="Edit Product" showBackButton />
        <LoadingScreen />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Edit Product" showBackButton />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={1}
          removeClippedSubviews={false}
        >
          {/* Image Thumbnails (add, remove, reorder) */}
          <View style={styles.imageThumbsRow}>
            <TouchableOpacity
              style={[styles.imagePicker, { backgroundColor: secondary }]}
              onPress={pickImage}
              activeOpacity={0.8}
              disabled={images.length >= MAX_IMAGES}
            >
              <ThemedText style={{ color: placeholderColor, fontSize: 15 }}>
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
          {/* Stock Quantity */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            placeholder="Stock Quantity"
            value={stockQuantity}
            onChangeText={setStockQuantity}
            keyboardType="numeric"
            placeholderTextColor={placeholderColor}
          />
          {/* Out of Stock Toggle */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: textColor }]}>
              {inStock ? "Available" : "Out of Stock"}
            </ThemedText>
            <Switch
              value={inStock}
              onValueChange={setInStock}
              thumbColor={
                inStock
                  ? accent
                  : Platform.OS === "android"
                  ? "#f4f3f4"
                  : undefined
              }
              trackColor={{ false: borderColor, true: "#b3d7ff" }}
            />
          </View>
          {/* Flash Sale Switch */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: textColor }]}>
              Flash Sale
            </ThemedText>
            <Switch
              value={flashSale}
              onValueChange={setFlashSale}
              thumbColor={
                flashSale
                  ? accent
                  : Platform.OS === "android"
                  ? "#f4f3f4"
                  : undefined
              }
              trackColor={{ false: borderColor, true: "#b3d7ff" }}
            />
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        {/* Fixed Save Button */}
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
              saving && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            <ThemedText style={styles.checkoutButtonText}>
              {saving ? "Saving..." : "Save Changes"}
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
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  imageThumbsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 18,
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
