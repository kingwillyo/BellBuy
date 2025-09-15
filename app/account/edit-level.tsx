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
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";

export default function EditLevelScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";

  const levelOptions = ["100", "200", "300", "400", "500", "Postgraduate"];

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
        setSelectedLevel(data.level || "");
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !selectedLevel) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ level: selectedLevel })
        .eq("id", user.id);

      if (error) throw error;

      Alert.alert("Success", "Level updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update level");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Level" showBackButton />

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={[styles.label, { color: textColor }]}>
          Choose Academic Level
        </ThemedText>

        {/* Level Dropdown */}
        <View style={styles.dropdownContainer}>
          <Pressable
            style={[
              styles.dropdown,
              {
                borderColor: showDropdown ? accent : "#E5E5E5",
                backgroundColor: isDarkMode ? "#23262F" : "#fff",
              },
            ]}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <ThemedText style={[styles.dropdownText, { color: textColor }]}>
              {selectedLevel || "Select Level"}
            </ThemedText>
            <Ionicons
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color={iconColor}
            />
          </Pressable>

          {/* Dropdown Options */}
          {showDropdown && (
            <View
              style={[
                styles.dropdownOptions,
                { backgroundColor: isDarkMode ? "#23262F" : "#fff" },
              ]}
            >
              {levelOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.dropdownOption,
                    {
                      backgroundColor:
                        selectedLevel === option
                          ? isDarkMode
                            ? "#2D3A5A"
                            : "#E0E7FF"
                          : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setSelectedLevel(option);
                    setShowDropdown(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.dropdownOptionText,
                      {
                        color: selectedLevel === option ? accent : textColor,
                        fontWeight: selectedLevel === option ? "bold" : "500",
                      },
                    ]}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: accent }]}
          onPress={handleSave}
          disabled={saving || !selectedLevel}
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
    marginBottom: 24,
  },
  dropdownContainer: {
    position: "relative",
    zIndex: 1,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownOptions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownOptionText: {
    fontSize: 16,
    textAlign: "center",
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
