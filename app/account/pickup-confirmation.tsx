import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logger } from "../../lib/logger";
import { supabase } from "../../lib/supabase";

interface PickupFormData {
  location: string;
  date: string;
  time: string;
  notes: string;
}

export default function PickupConfirmationScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [formData, setFormData] = useState<PickupFormData>({
    location: "",
    date: "",
    time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const textColor = isDarkMode ? "#FFF" : "#000";
  const backgroundColor = isDarkMode ? "#000" : "#FFF";
  const cardBackgroundColor = isDarkMode ? "#1C1C1E" : "#F2F2F7";
  const borderColor = isDarkMode ? "#38383A" : "#C7C7CC";

  // Get tomorrow's date as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Get date 30 days from now as maximum date
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const handleInputChange = (field: keyof PickupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmPickup = async () => {
    // Validation
    if (!formData.location.trim()) {
      Alert.alert("Error", "Please enter a pickup location");
      return;
    }
    if (!formData.date) {
      Alert.alert("Error", "Please select a pickup date");
      return;
    }
    if (!formData.time) {
      Alert.alert("Error", "Please select a pickup time");
      return;
    }

    setLoading(true);
    try {
      // Update the order with pickup information and confirm it
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            order_id: parseInt(orderId as string),
            status: "confirmed",
            pickup_location: formData.location.trim(),
            pickup_date: formData.date,
            pickup_time: formData.time,
            pickup_notes: formData.notes.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to confirm pickup details");
      }

      Alert.alert(
        "Success",
        "Pickup details confirmed and order status updated!",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error confirming pickup:", error);
      Alert.alert("Error", error.message || "Failed to confirm pickup details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#0A84FF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Confirm Pickup Details
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[styles.infoCard, { backgroundColor: cardBackgroundColor }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#0A84FF"
          />
          <Text style={[styles.infoText, { color: textColor }]}>
            This order includes shipping. Please provide pickup location and
            timing details for the customer.
          </Text>
        </View>

        {/* Pickup Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>
            Pickup Location *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={formData.location}
            onChangeText={(value) => handleInputChange("location", value)}
            placeholder="e.g., Main Campus Gate, Library Entrance"
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#C7C7CC"}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Pickup Date */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>
            Pickup Date *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={formData.date}
            onChangeText={(value) => handleInputChange("date", value)}
            placeholder="YYYY-MM-DD (e.g., 2024-01-15)"
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#C7C7CC"}
            keyboardType="numeric"
          />
          <Text
            style={[
              styles.helpText,
              { color: isDarkMode ? "#8E8E93" : "#6D6D70" },
            ]}
          >
            Available from {minDate} to {maxDateStr}
          </Text>
        </View>

        {/* Pickup Time */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>
            Pickup Time *
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={formData.time}
            onChangeText={(value) => handleInputChange("time", value)}
            placeholder="HH:MM (e.g., 14:30)"
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#C7C7CC"}
            keyboardType="numeric"
          />
          <Text
            style={[
              styles.helpText,
              { color: isDarkMode ? "#8E8E93" : "#6D6D70" },
            ]}
          >
            Use 24-hour format (00:00 - 23:59)
          </Text>
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>
            Additional Notes
          </Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              {
                backgroundColor: cardBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={formData.notes}
            onChangeText={(value) => handleInputChange("notes", value)}
            placeholder="Any special instructions for pickup (optional)"
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#C7C7CC"}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View
        style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <TouchableOpacity
          style={[styles.confirmButton, { opacity: loading ? 0.6 : 1 }]}
          onPress={handleConfirmPickup}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? "Confirming..." : "Confirm Pickup Details"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  confirmButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
