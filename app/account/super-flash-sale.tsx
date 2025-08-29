/* eslint-disable @typescript-eslint/no-unused-vars */

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useSuperFlashSaleExpiration } from "@/hooks/useSuperFlashSaleExpiration";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_urls: string[];
  main_image: string;
  category: string;
  flash_sale: boolean;
  is_super_flash_sale: boolean;
  super_flash_price?: number;
  super_flash_start?: string;
  super_flash_end?: string;
}



export default function SuperFlashSaleScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [superFlashPrice, setSuperFlashPrice] = useState("");
  const [superFlashStart, setSuperFlashStart] = useState("");
  const [superFlashEnd, setSuperFlashEnd] = useState("");
  const [isSuperFlashSale, setIsSuperFlashSale] = useState(false);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );

  // Temporary date states for modal pickers
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  );

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const cardBackgroundColor = useThemeColor(
    { light: "#F5F5F5", dark: "#282828" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E0E0E0", dark: "#404040" },
    "icon"
  );
  const tintColor = Colors.light.tint; // Use the blue color from your app

  // Handle automatic expiration of Super Flash Sale products
  useSuperFlashSaleExpiration(products);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchProducts();
      }
    }, [user])
  );

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to fetch products");
    }
  };

  const toggleSuperFlashSale = async (product: Product) => {
    if (!user) return;

    try {
      const newSuperFlashSale = !product.is_super_flash_sale;

      // Check if trying to enable Super Flash Sale
      if (newSuperFlashSale) {
        // Count current active Super Flash Sale products
        const activeSuperFlashSales = products.filter(
          (p) => p.is_super_flash_sale && p.id !== product.id
        ).length;

        if (activeSuperFlashSales >= 2) {
          Alert.alert(
            "Limit Reached",
            "You can only have 2 Super Flash Sale products active at a time. Please disable one of your existing Super Flash Sales first."
          );
          return;
        }
      }

      const updateData: any = {
        is_super_flash_sale: newSuperFlashSale,
      };

      // If enabling super flash sale, set default values
      if (newSuperFlashSale) {
        const now = new Date();
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        updateData.super_flash_start = now.toISOString();
        updateData.super_flash_end = endTime.toISOString();
        updateData.super_flash_price = Math.round(product.price * 0.7); // 30% discount
      } else {
        // If disabling, clear the fields
        updateData.super_flash_start = null;
        updateData.super_flash_end = null;
        updateData.super_flash_price = null;
      }

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", product.id)
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert(
        "Success",
        newSuperFlashSale
          ? "Product added to Super Flash Sale!"
          : "Product removed from Super Flash Sale!"
      );

      fetchProducts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update product");
    }
  };

  const updateSuperFlashSale = async (productId: string) => {
    if (!user) return;

    try {
      // Check if trying to enable Super Flash Sale
      if (isSuperFlashSale) {
        // Count current active Super Flash Sale products (excluding the one being edited)
        const activeSuperFlashSales = products.filter(
          (p) => p.is_super_flash_sale && p.id !== productId
        ).length;

        if (activeSuperFlashSales >= 2) {
          Alert.alert(
            "Limit Reached",
            "You can only have 2 Super Flash Sale products active at a time. Please disable one of your existing Super Flash Sales first."
          );
          return;
        }
      }

      const updateData: any = {
        is_super_flash_sale: isSuperFlashSale,
      };

      if (isSuperFlashSale) {
        if (superFlashPrice) {
          updateData.super_flash_price = parseFloat(superFlashPrice);
        }
        if (superFlashStart) {
          updateData.super_flash_start = new Date(
            superFlashStart
          ).toISOString();
        }
        if (superFlashEnd) {
          updateData.super_flash_end = new Date(superFlashEnd).toISOString();
        }
      }

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId)
        .eq("user_id", user.id);

      if (error) throw error;

      Alert.alert("Success", "Super Flash Sale updated successfully!");
      setEditingProduct(null);
      setSuperFlashPrice("");
      setSuperFlashStart("");
      setSuperFlashEnd("");
      setIsSuperFlashSale(false);
      fetchProducts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update Super Flash Sale");
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setIsSuperFlashSale(product.is_super_flash_sale);
    setSuperFlashPrice(product.super_flash_price?.toString() || "");

    const startDateValue = product.super_flash_start
      ? new Date(product.super_flash_start)
      : new Date();
    const endDateValue = product.super_flash_end
      ? new Date(product.super_flash_end)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    setStartDate(startDateValue);
    setEndDate(endDateValue);
    setSuperFlashStart(
      product.super_flash_start ? startDateValue.toISOString().slice(0, 16) : ""
    );
    setSuperFlashEnd(
      product.super_flash_end ? endDateValue.toISOString().slice(0, 16) : ""
    );
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setSuperFlashPrice("");
    setSuperFlashStart("");
    setSuperFlashEnd("");
    setIsSuperFlashSale(false);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const handleStartDateDone = () => {
    setStartDate(tempStartDate);
    setSuperFlashStart(tempStartDate.toISOString().slice(0, 16));
    setShowStartDatePicker(false);
  };

  const handleEndDateDone = () => {
    setEndDate(tempEndDate);
    setSuperFlashEnd(tempEndDate.toISOString().slice(0, 16));
    setShowEndDatePicker(false);
  };

  const handleStartDateCancel = () => {
    setTempStartDate(startDate);
    setShowStartDatePicker(false);
  };

  const handleEndDateCancel = () => {
    setTempEndDate(endDate);
    setShowEndDatePicker(false);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "Select date";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  if (!user && !authLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedText>Please sign in to manage your products.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: headerBackgroundColor }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          zIndex: 10,
          height: 56,
          backgroundColor: headerBackgroundColor,
          // Remove paddingTop: insets.top (SafeAreaView handles it)
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
          Super Flash Sale
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={[styles.scrollView]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            Create limited-time offers to boost sales
          </ThemedText>
          <View style={styles.counterContainer}>
            <ThemedText style={[styles.counterText, { color: textColor }]}>
              {products.filter((p) => p.is_super_flash_sale).length}/2 Super
              Flash Sales active
            </ThemedText>
          </View>
        </View>

        {authLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: textColor }}>
              Loading...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.productsList}>
            {products.map((product) => (
              <View
                key={product.id}
                style={[styles.productCard, { borderColor }]}
              >
                <View style={styles.productInfo}>
                  <Image
                    source={{
                      uri:
                        product.main_image ||
                        product.image_urls?.[0] ||
                        "https://via.placeholder.com/80x80",
                    }}
                    style={styles.productImage}
                    contentFit="cover"
                  />
                  <View style={styles.productDetails}>
                    <ThemedText
                      type="subtitle"
                      numberOfLines={2}
                      style={{ color: textColor }}
                    >
                      {product.name}
                    </ThemedText>
                    <ThemedText style={[styles.price, { color: textColor }]}>
                      ₦{product.price.toLocaleString()}
                    </ThemedText>
                    <View style={styles.statusContainer}>
                      {product.is_super_flash_sale ? (
                        <View style={styles.superFlashBadge}>
                          <Text style={styles.superFlashText}>
                            🔥 Super Flash Sale
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[styles.regularText, { color: textColor }]}
                        >
                          Regular Product
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {editingProduct === product.id ? (
                  <View
                    style={[styles.editForm, { borderTopColor: borderColor }]}
                  >
                    <View style={styles.switchContainer}>
                      <Text style={[styles.switchLabel, { color: textColor }]}>
                        Enable Super Flash Sale
                      </Text>
                      <Switch
                        value={isSuperFlashSale}
                        onValueChange={setIsSuperFlashSale}
                        trackColor={{ false: "#767577", true: tintColor }}
                        thumbColor={isSuperFlashSale ? "#FFFFFF" : "#f4f3f4"}
                      />
                    </View>

                    {isSuperFlashSale && (
                      <>
                        <Text
                          style={{
                            color: textColor,
                            marginBottom: 4,
                            marginLeft: 2,
                          }}
                        >
                          Flash Sale Price
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            { color: textColor, borderColor },
                          ]}
                          placeholder="Super Flash Price (₦)"
                          placeholderTextColor="#888"
                          value={superFlashPrice}
                          onChangeText={setSuperFlashPrice}
                          keyboardType="numeric"
                        />
                        <Text
                          style={{
                            color: textColor,
                            marginBottom: 4,
                            marginLeft: 2,
                          }}
                        >
                          End Date
                        </Text>
                        <TouchableOpacity
                          style={[styles.dateInput, { borderColor }]}
                          onPress={() => {
                            setTempEndDate(endDate);
                            setShowEndDatePicker(true);
                          }}
                        >
                          <ThemedText
                            style={[styles.dateInputText, { color: textColor }]}
                          >
                            {formatDateForDisplay(superFlashEnd)}
                          </ThemedText>
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color={textColor}
                          />
                        </TouchableOpacity>
                      </>
                    )}

                    <View style={styles.editButtons}>
                      <TouchableOpacity
                        style={[styles.cancelButton, { borderColor }]}
                        onPress={cancelEditing}
                      >
                        <ThemedText
                          style={[
                            styles.cancelButtonText,
                            { color: textColor },
                          ]}
                        >
                          Cancel
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          { backgroundColor: tintColor },
                        ]}
                        onPress={() => updateSuperFlashSale(product.id)}
                      >
                        <ThemedText style={styles.saveButtonText}>
                          Save
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        {
                          backgroundColor: product.is_super_flash_sale
                            ? "#6B7280"
                            : tintColor,
                        },
                      ]}
                      onPress={() => toggleSuperFlashSale(product)}
                    >
                      <ThemedText
                        style={[
                          styles.toggleButtonText,
                          product.is_super_flash_sale &&
                            styles.disableButtonText,
                        ]}
                      >
                        {product.is_super_flash_sale ? "Disable" : "Enable"}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, { borderColor }]}
                      onPress={() => startEditing(product)}
                    >
                      <Ionicons
                        name="settings-outline"
                        size={20}
                        color={textColor}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {products.length === 0 && !authLoading && (
          <View style={styles.emptyContainer}>
            <ThemedText style={[styles.emptyText, { color: textColor }]}>
              No products found. Create some products first!
            </ThemedText>
          </View>
        )}
      )}
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <Modal
          transparent={true}
          visible={showStartDatePicker}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: cardBackgroundColor },
              ]}
            >
              <View style={styles.modalHeader}>
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                  Select Start Date & Time
                </ThemedText>
              </View>
              <DateTimePicker
                value={tempStartDate}
                mode="datetime"
                display="spinner"
                onChange={handleStartDateChange}
                style={styles.datePicker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={handleStartDateCancel}
                >
                  <ThemedText
                    style={[styles.modalButtonText, { color: textColor }]}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.doneModalButton,
                    { backgroundColor: tintColor },
                  ]}
                  onPress={handleStartDateDone}
                >
                  <ThemedText style={styles.doneModalButtonText}>
                    Done
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {showEndDatePicker && (
        <Modal
          transparent={true}
          visible={showEndDatePicker}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: cardBackgroundColor },
              ]}
            >
              <View style={styles.modalHeader}>
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                  Select End Date & Time
                </ThemedText>
              </View>
              <DateTimePicker
                value={tempEndDate}
                mode="datetime"
                display="spinner"
                onChange={handleEndDateChange}
                style={styles.datePicker}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={handleEndDateCancel}
                >
                  <ThemedText
                    style={[styles.modalButtonText, { color: textColor }]}
                  >
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.doneModalButton,
                    { backgroundColor: tintColor },
                  ]}
                  onPress={handleEndDateDone}
                >
                  <ThemedText style={styles.doneModalButtonText}>
                    Done
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginVertical: 12,
    width: "100%",
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  productsList: {
    gap: 16,
  },
  productCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productInfo: {
    flexDirection: "row",
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  statusContainer: {
    marginTop: 8,
  },
  superFlashBadge: {
    backgroundColor: "#0A84FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  superFlashText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  regularText: {
    fontSize: 12,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: "#FF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disableButton: {
    backgroundColor: "#666",
  },
  toggleButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  disableButtonText: {
    color: "#FFFFFF",
  },
  editButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  editForm: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 16,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#0A84FF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.7,
  },
  counterContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  counterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateInputText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  datePicker: {
    height: 200,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelModalButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  doneModalButton: {
    // backgroundColor will be set inline
  },
  modalButtonText: {
    fontWeight: "500",
  },
  doneModalButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

});
