/* eslint-disable @typescript-eslint/no-unused-vars */
import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { logger } from "@/lib/logger";
import {
  callEdgeFunctionWithRetry,
  executeWithOfflineSupport,
} from "@/lib/networkUtils";
import { sanitizeInput, SECURITY_CONFIG } from "@/lib/security-config";
import { supabase, uploadMultipleImages } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
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
import { useOffline } from "../../context/OfflineContext";

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
  { id: "20", name: "Services" },
];
const MAX_IMAGES = 5;
const { width } = Dimensions.get("window");

// Validation functions
const validateProductName = (
  name: string
): { isValid: boolean; error: string } => {
  const sanitized = sanitizeInput(name);
  if (!sanitized.trim()) {
    return { isValid: false, error: "Product name is required" };
  }
  if (sanitized.length < 3) {
    return {
      isValid: false,
      error: "Product name must be at least 3 characters",
    };
  }
  if (sanitized.length > 100) {
    return {
      isValid: false,
      error: "Product name must be less than 100 characters",
    };
  }
  return { isValid: true, error: "" };
};

const validatePrice = (price: string): { isValid: boolean; error: string } => {
  const sanitized = sanitizeInput(price);
  if (!sanitized.trim()) {
    return { isValid: false, error: "Price is required" };
  }
  const priceNum = parseFloat(sanitized);
  if (isNaN(priceNum)) {
    return { isValid: false, error: "Please enter a valid price" };
  }
  if (priceNum < 0) {
    return { isValid: false, error: "Price cannot be negative" };
  }
  if (priceNum > 5000000) {
    return { isValid: false, error: "Price cannot exceed ₦5,000,000" };
  }
  return { isValid: true, error: "" };
};

const validateDescription = (
  description: string
): { isValid: boolean; error: string } => {
  const sanitized = sanitizeInput(description);
  if (!sanitized.trim()) {
    return { isValid: false, error: "Description is required" };
  }
  if (sanitized.length < 10) {
    return {
      isValid: false,
      error: "Description must be at least 10 characters",
    };
  }
  if (sanitized.length > 500) {
    return {
      isValid: false,
      error: "Description must be less than 500 characters",
    };
  }
  return { isValid: true, error: "" };
};

const validateStockQuantity = (
  quantity: string
): { isValid: boolean; error: string } => {
  const sanitized = sanitizeInput(quantity);
  if (!sanitized.trim()) {
    return { isValid: false, error: "Stock quantity is required" };
  }
  const qty = parseInt(sanitized);
  if (isNaN(qty)) {
    return { isValid: false, error: "Please enter a valid quantity" };
  }
  if (qty < 0) {
    return { isValid: false, error: "Quantity cannot be negative" };
  }
  if (qty > 1000) {
    return { isValid: false, error: "Quantity cannot exceed 1000" };
  }
  return { isValid: true, error: "" };
};

const validateImage = (uri: string): { isValid: boolean; error: string } => {
  // Basic validation for image URI
  if (!uri || typeof uri !== "string") {
    return { isValid: false, error: "Invalid image" };
  }

  // Check if it's a valid image URI
  const validImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExtension = validImageExtensions.some(
    (ext) => uri.toLowerCase().includes(ext) || uri.startsWith("data:image/")
  );

  if (!hasValidExtension && !uri.startsWith("file://")) {
    return { isValid: false, error: "Invalid image format" };
  }

  return { isValid: true, error: "" };
};

export default function SellScreen() {
  const { user, isLoading } = useAuth();
  const { addToRetryQueue } = useOffline();
  // Check featured listing count on mount and when toggling (must be before any early return)
  const [featuredListingCount, setFeaturedListingCount] = useState<
    number | null
  >(null);
  const [checkingFeaturedListing, setCheckingFeaturedListing] = useState(false);
  useEffect(() => {
    if (user) {
      (async () => {
        setCheckingFeaturedListing(true);
        const { data: featuredListings, error } = await supabase
          .from("products")
          .select("id")
          .eq("user_id", user.id)
          .eq("flash_sale", true);
        if (!error && featuredListings) {
          setFeaturedListingCount(featuredListings.length);
        }
        setCheckingFeaturedListing(false);
      })();
    }
  }, [user]);
  const [images, setImages] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [description, setDescription] = useState("");
  const [featuredListing, setFeaturedListing] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("1");
  const [deliveryTime, setDeliveryTime] = useState("Same day");
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [showHandlingTimeInfo, setShowHandlingTimeInfo] = useState(false);

  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    name: "",
    price: "",
    description: "",
    stockQuantity: "",
    images: "",
  });
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    price: false,
    description: false,
    stockQuantity: false,
  });
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

  const showImagePickerOptions = () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(
        "Limit reached",
        `You can only upload up to ${MAX_IMAGES} images.`
      );
      return;
    }

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickFromLibrary();
          }
        }
      );
    } else {
      Alert.alert("Select Image", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Choose from Library", onPress: pickFromLibrary },
      ]);
    }
  };

  const takePhoto = async () => {
    setImageLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your camera."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets
          .map((a) => a.uri)
          .slice(0, MAX_IMAGES - images.length);

        // Validate images before adding
        const validImages = newUris.filter((uri) => {
          const validation = validateImage(uri);
          if (!validation.isValid) {
            Alert.alert("Invalid Image", validation.error);
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          setImages((prev) => [...prev, ...validImages].slice(0, MAX_IMAGES));
          setValidationErrors((prev) => ({ ...prev, images: "" }));
        }
      }
    } finally {
      setImageLoading(false);
    }
  };

  const pickFromLibrary = async () => {
    setImageLoading(true);
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos."
        );
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

        // Validate images before adding
        const validImages = newUris.filter((uri) => {
          const validation = validateImage(uri);
          if (!validation.isValid) {
            Alert.alert("Invalid Image", validation.error);
            return false;
          }
          return true;
        });

        if (validImages.length > 0) {
          setImages((prev) => [...prev, ...validImages].slice(0, MAX_IMAGES));
          setValidationErrors((prev) => ({ ...prev, images: "" }));
        }
      }
    } finally {
      setImageLoading(false);
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
    // Clear image validation error when images are removed
    if (images.length === 1) {
      setValidationErrors((prev) => ({ ...prev, images: "" }));
    }
  };

  // Real-time validation functions
  const validateField = (field: string, value: string) => {
    let validation;
    switch (field) {
      case "name":
        validation = validateProductName(value);
        break;
      case "price":
        validation = validatePrice(value);
        break;
      case "description":
        validation = validateDescription(value);
        break;
      case "stockQuantity":
        validation = validateStockQuantity(value);
        break;
      default:
        return;
    }

    setValidationErrors((prev) => ({
      ...prev,
      [field]: validation.error,
    }));
  };

  const handleNameChange = (text: string) => {
    // Don't sanitize name as it removes spaces - just trim and limit length
    const trimmed = text.trim();
    setName(text); // Keep original text with spaces
    if (touchedFields.name) {
      validateField("name", trimmed);
    }
  };

  const handlePriceChange = (text: string) => {
    // Allow only numbers and decimal point
    const sanitized = text.replace(/[^0-9.]/g, "");
    setPrice(sanitized);
    if (touchedFields.price) {
      validateField("price", sanitized);
    }
  };

  const handleDescriptionChange = (text: string) => {
    // Don't sanitize description as it removes spaces - just trim and limit length
    const trimmed = text.trim();
    setDescription(text); // Keep original text with spaces
    if (touchedFields.description) {
      validateField("description", trimmed);
    }
  };

  const handleStockQuantityChange = (text: string) => {
    // Allow only numbers
    const sanitized = sanitizeInput(text.replace(/[^0-9]/g, ""));
    setStockQuantity(sanitized);
    if (touchedFields.stockQuantity) {
      validateField("stockQuantity", sanitized);
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    switch (field) {
      case "name":
        validateField("name", name);
        break;
      case "price":
        validateField("price", price);
        break;
      case "description":
        validateField("description", description);
        break;
      case "stockQuantity":
        validateField("stockQuantity", stockQuantity);
        break;
    }
  };

  const handleHandlingTimeInfoPress = () => {
    Alert.alert(
      "Handling Time",
      "How long the seller needs to prepare the order before it's ready for pickup or delivery. This includes packaging, quality checks, and preparation time.",
      [{ text: "Got it", style: "default" }]
    );
  };

  const handleFeaturedListingToggle = async (value: boolean) => {
    setFeaturedListing(value);
  };

  const handlePost = async () => {
    logger.debug(
      "Product posting initiated",
      {
        hasName: !!name,
        hasPrice: !!price,
        hasDescription: !!description,
        category,
        imageCount: images.length,
        isFeaturedListing: featuredListing,
        hasUser: !!user,
      },
      { component: "Sell", action: "handlePost" }
    );

    // Mark all fields as touched for validation
    setTouchedFields({
      name: true,
      price: true,
      description: true,
      stockQuantity: true,
    });

    // Validate all fields
    const nameValidation = validateProductName(name);
    const priceValidation = validatePrice(price);
    const descriptionValidation = validateDescription(description);
    const stockValidation = validateStockQuantity(stockQuantity);
    const imageValidation =
      images.length === 0
        ? { isValid: false, error: "At least one image is required" }
        : { isValid: true, error: "" };

    // Update validation errors
    setValidationErrors({
      name: nameValidation.error,
      price: priceValidation.error,
      description: descriptionValidation.error,
      stockQuantity: stockValidation.error,
      images: imageValidation.error,
    });

    // Check if any validation failed
    if (
      !nameValidation.isValid ||
      !priceValidation.isValid ||
      !descriptionValidation.isValid ||
      !stockValidation.isValid ||
      !imageValidation.isValid
    ) {
      logger.warn(
        "Validation failed for product posting",
        {
          nameValid: nameValidation.isValid,
          priceValid: priceValidation.isValid,
          descriptionValid: descriptionValidation.isValid,
          stockValid: stockValidation.isValid,
          imageValid: imageValidation.isValid,
        },
        { component: "Sell" }
      );

      Alert.alert(
        "Please fix the errors",
        "Please correct the highlighted fields before posting."
      );
      return;
    }

    // Parse stock quantity
    const stockQty = parseInt(stockQuantity);

    setLoading(true);
    try {
      // 1. Upload images to Supabase Storage
      logger.debug(
        "Starting image upload",
        { imageCount: images.length },
        { component: "Sell" }
      );
      const imageUrls = await uploadMultipleImages(images, user.id);
      logger.debug(
        "Image upload completed",
        { uploadedCount: imageUrls.length },
        { component: "Sell" }
      );
      // 2. Insert product row into Supabase
      const productData = {
        user_id: user.id,
        name: name.trim(),
        price: parseFloat(price),
        description: description.trim(),
        category: category.trim(),
        flash_sale: featuredListing,
        stock_quantity: stockQty,
        in_stock: stockQty > 0,
        image_urls: imageUrls,
        main_image: imageUrls[0],
        delivery_time: deliveryTime,
      };

      logger.debug("Product data to insert", productData, {
        component: "Sell",
      });

      const { data: insertedProduct, error } = await supabase
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      if (error) {
        logger.error("Database insert failed", error, { component: "Sell" });
        logger.error("Product data that failed", productData, {
          component: "Sell",
        });
        throw error;
      }

      logger.debug(
        "Product inserted successfully",
        { productId: insertedProduct.id },
        { component: "Sell" }
      );

      // 3. Send social notification with retry logic
      try {
        const { data: notificationData, error: notificationError } =
          await callEdgeFunctionWithRetry(
            supabase,
            "social_notify",
            {
              event_type: "new_product",
              metadata: {
                product_id: insertedProduct.id,
                seller_id: user.id,
                name: name.trim(),
              },
            },
            {
              maxRetries: 2,
              timeout: 8000,
              context: "sending new product notification",
            }
          );

        if (notificationError) {
          logger.warn(
            "Failed to send new product notification after retries",
            notificationError,
            { component: "SellScreen" }
          );
          // Don't fail the product creation if notification fails
        }
      } catch (notifyError) {
        logger.warn("Failed to send new product notification", notifyError, {
          component: "SellScreen",
        });
        // Don't fail the product creation if notification fails
      }

      // 4. Success UX
      logger.info("Product posted successfully", undefined, {
        component: "Sell",
      });
      Alert.alert("Success", "Your Product is now listed successfully!");

      // Reset form
      setImages([]);
      setName("");
      setPrice("");
      setCategory(categories[0].name);
      setDescription("");
      setFeaturedListing(false);
      setStockQuantity("1");
      setDeliveryTime("Same day");
      setValidationErrors({
        name: "",
        price: "",
        description: "",
        stockQuantity: "",
        images: "",
      });
      setTouchedFields({
        name: false,
        price: false,
        description: false,
        stockQuantity: false,
      });
    } catch (err: any) {
      logger.error("Product posting failed", err, { component: "Sell" });

      // Log more detailed error information
      if (err?.message) {
        logger.error(
          "Error message",
          { message: err.message },
          { component: "Sell" }
        );
      }
      if (err?.details) {
        logger.error(
          "Error details",
          { details: err.details },
          { component: "Sell" }
        );
      }
      if (err?.hint) {
        logger.error("Error hint", { hint: err.hint }, { component: "Sell" });
      }
      if (err?.code) {
        logger.error("Error code", { code: err.code }, { component: "Sell" });
      }

      // Show user-friendly error message
      let errorMessage = "Failed to post product. Please try again.";
      if (err?.message) {
        errorMessage = `Failed to post product: ${err.message}`;
      }

      Alert.alert("Error", errorMessage);

      // Add to retry queue if offline
      addToRetryQueue(async () => {
        await handlePost();
      });

      executeWithOfflineSupport(
        async () => {
          // This will be retried when online
          throw err;
        },
        {
          context: "posting product",
          addToRetryQueue: true,
          showOfflineMessage: true,
        }
      );
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
        <Header title="Upload a Product" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tips Section */}
          <View style={[styles.tipsContainer, { backgroundColor: secondary }]}>
            <ThemedText style={[styles.tipsTitle, { color: textColor }]}>
              💡 Tips for better listings
            </ThemedText>
            <ThemedText style={[styles.tipsText, { color: placeholderColor }]}>
              • Use clear, well-lit photos • Write detailed descriptions • Set
              competitive prices • Choose accurate categories
            </ThemedText>
          </View>

          {/* Image Picker */}
          <View style={styles.imagePickerRow}>
            <TouchableOpacity
              style={[
                styles.imagePicker,
                {
                  backgroundColor: secondary,
                  opacity: imageLoading ? 0.6 : 1,
                },
              ]}
              onPress={showImagePickerOptions}
              activeOpacity={0.8}
              disabled={images.length >= MAX_IMAGES || imageLoading}
              accessibilityLabel={
                images.length === 0 ? "Add product images" : "Add more images"
              }
              accessibilityHint="Tap to take a photo or choose from library"
            >
              <ThemedText
                style={[styles.imagePickerText, { color: placeholderColor }]}
              >
                {imageLoading
                  ? "Loading..."
                  : `+${images.length === 0 ? " Add Images" : " Add More"}`}
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
            {validationErrors.images && (
              <ThemedText style={styles.errorText}>
                {validationErrors.images}
              </ThemedText>
            )}
          </View>
          {/* Product Name */}
          <View>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Product Name
              </ThemedText>
              {!validationErrors.name && (
                <ThemedText style={styles.characterCount}>
                  {name.length}/100
                </ThemedText>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: validationErrors.name ? "#FF3B30" : borderColor,
                  color: textColor,
                },
              ]}
              placeholder="Enter product name"
              value={name}
              onChangeText={handleNameChange}
              onBlur={() => handleFieldBlur("name")}
              placeholderTextColor={placeholderColor}
              maxLength={100}
              accessibilityLabel="Product name"
              accessibilityHint="Enter the name of your product"
            />
            {validationErrors.name && (
              <ThemedText style={styles.errorText}>
                {validationErrors.name}
              </ThemedText>
            )}
          </View>
          {/* Price */}
          <View>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Price (₦)
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: validationErrors.price ? "#FF3B30" : borderColor,
                  color: textColor,
                },
              ]}
              placeholder="Enter price in Nigerian Naira"
              value={price}
              onChangeText={handlePriceChange}
              onBlur={() => handleFieldBlur("price")}
              keyboardType="numeric"
              placeholderTextColor={placeholderColor}
              maxLength={12}
              accessibilityLabel="Product price"
              accessibilityHint="Enter the price in Nigerian Naira"
            />
            {validationErrors.price && (
              <ThemedText style={styles.errorText}>
                {validationErrors.price}
              </ThemedText>
            )}
          </View>
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
          <View>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Description
              </ThemedText>
              {!validationErrors.description && (
                <ThemedText style={styles.characterCount}>
                  {description.length}/500
                </ThemedText>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: validationErrors.description
                    ? "#FF3B30"
                    : borderColor,
                  color: textColor,
                },
              ]}
              placeholder="Describe your product in detail"
              value={description}
              onChangeText={handleDescriptionChange}
              onBlur={() => handleFieldBlur("description")}
              multiline
              numberOfLines={4}
              placeholderTextColor={placeholderColor}
              maxLength={500}
              accessibilityLabel="Product description"
              accessibilityHint="Describe your product in detail"
            />
            {validationErrors.description && (
              <ThemedText style={styles.errorText}>
                {validationErrors.description}
              </ThemedText>
            )}
          </View>
          {/* Stock Quantity */}
          <View>
            <View style={styles.fieldHeader}>
              <ThemedText style={[styles.fieldLabel, { color: textColor }]}>
                Stock Quantity
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: cardBackgroundColor,
                  borderColor: validationErrors.stockQuantity
                    ? "#FF3B30"
                    : borderColor,
                  color: textColor,
                },
              ]}
              placeholder="Enter number of items available"
              value={stockQuantity}
              onChangeText={handleStockQuantityChange}
              onBlur={() => handleFieldBlur("stockQuantity")}
              keyboardType="numeric"
              placeholderTextColor={placeholderColor}
              maxLength={4}
              accessibilityLabel="Stock quantity"
              accessibilityHint="Enter how many items you have available"
            />
            {validationErrors.stockQuantity && (
              <ThemedText style={styles.errorText}>
                {validationErrors.stockQuantity}
              </ThemedText>
            )}
          </View>
          {/* Delivery Time */}
          <View style={styles.deliveryTimeContainer}>
            <View style={styles.deliveryTimeHeader}>
              <ThemedText
                style={[styles.deliveryTimeLabel, { color: textColor }]}
              >
                Handling time
              </ThemedText>
              <TouchableOpacity
                onPress={handleHandlingTimeInfoPress}
                style={styles.infoIconContainer}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
                accessibilityLabel="What is handling time?"
                accessibilityHint="Tap to learn about handling time"
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={accent}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.deliveryTimeScroll}
              contentContainerStyle={styles.deliveryTimeRow}
            >
              {[
                "Same day",
                "1-2 days",
                "2-3 days",
                "3-5 days",
                "1 week",
                "2 weeks",
              ].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.deliveryTimeButton,
                    { backgroundColor: secondary },
                    deliveryTime === time && { backgroundColor: accent },
                  ]}
                  onPress={() => setDeliveryTime(time)}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    style={[
                      styles.deliveryTimeButtonText,
                      {
                        color: deliveryTime === time ? "#FFF" : textColor,
                        fontWeight: deliveryTime === time ? "bold" : "normal",
                      },
                    ]}
                  >
                    {time}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Featured Listing Switch */}
          <View style={styles.switchRow}>
            <ThemedText style={[styles.switchLabel, { color: textColor }]}>
              Featured Listing
            </ThemedText>
            <Switch
              value={featuredListing}
              onValueChange={handleFeaturedListingToggle}
              thumbColor={
                featuredListing
                  ? accent
                  : Platform.OS === "android"
                    ? "#f4f3f4"
                    : undefined
              }
              trackColor={{ false: borderColor, true: "#b3d7ff" }}
              disabled={checkingFeaturedListing}
            />
          </View>
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
              {
                backgroundColor: accent,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handlePost}
            disabled={loading || imageLoading}
            activeOpacity={0.8}
            accessibilityLabel="Post product"
            accessibilityHint="Submit your product listing"
          >
            <ThemedText style={styles.checkoutButtonText}>
              {loading
                ? "Posting..."
                : imageLoading
                  ? "Processing Images..."
                  : "Post Product"}
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
  deliveryTimeContainer: {
    marginBottom: 18,
  },
  deliveryTimeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  deliveryTimeLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  infoIconContainer: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 26,
    minHeight: 26,
  },
  deliveryTimeScroll: {
    flexGrow: 0,
  },
  deliveryTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  deliveryTimeButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  deliveryTimeButtonText: {
    fontSize: 15,
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
  errorText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  characterCount: {
    color: "#888",
    fontSize: 12,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  tipsContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
