import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";

export default function EditDepartmentScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [department, setDepartment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Theme colors
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const iconColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "tint"
  );
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const dividerColor = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );
  const inputBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#23262F" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#404040" },
    "text"
  );
  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setDepartment(data.department || "");
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ department: department.trim() })
        .eq("id", user.id);

      if (error) throw error;

      Alert.alert("Success", "Department updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Department" showBackButton />

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={[styles.label, { color: textColor }]}>
          Enter Department
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: textColor }]}>
          Enter your academic department or field of study
        </ThemedText>

        {/* Department Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: inputBackgroundColor,
                borderColor: borderColor,
                color: textColor,
              },
            ]}
            value={department}
            onChangeText={setDepartment}
            placeholder="e.g., Computer Science, Medicine, Engineering"
            placeholderTextColor={isDarkMode ? "#888" : "#999"}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: accent }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  headerBack: {
    width: 26,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 22,
  },
  headerDivider: {
    height: 1,
    opacity: 0.15,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  inputContainer: {
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 56,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
});
