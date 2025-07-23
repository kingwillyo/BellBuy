import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AddressScreen() {
  const { user, isLoading } = useAuth();
  const [address, setAddress] = useState("Hostel B, Main Campus");

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Return null if not authenticated (redirect will be triggered by useAuth)
  if (!user) {
    return null;
  }

  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");

  const handleSave = () => {
    // In real app, sync to Supabase here
    Alert.alert("✅ Address updated!");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <ThemedText style={styles.label}>Delivery Address</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: accent }]}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your hostel/building"
          placeholderTextColor="#888"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: accent }]}
          onPress={handleSave}
        >
          <ThemedText style={styles.saveBtnText}>Save</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "transparent",
  },
  card: {
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 32,
  },
  label: {
    color: "#8E8E93",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: "#F7F7F7",
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
});
