import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spacing } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);

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
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "borderColor"
  );
  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";

  // Password validation function (same as signup page)
  const validatePassword = (password: string) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const isValid = Object.values(requirements).every(Boolean);

    return {
      isValid,
      requirements,
      message: isValid
        ? "Password is strong"
        : "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
    };
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert("Error", passwordValidation.message);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      // First verify the old password is correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || "",
        password: oldPassword,
      });

      if (signInError) {
        Alert.alert("Error", "Old password is incorrect");
        setSaving(false);
        return;
      }

      // If old password is correct, update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert("Success", "Password changed successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: headerBackgroundColor }}
      edges={["left", "right"]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={[
            styles.headerRow,
            {
              paddingTop: insets.top,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={26} color={iconColor} />
          </TouchableOpacity>
          <ThemedText
            type="title"
            style={[styles.headerTitle, { color: textColor }]}
          >
            Change Password
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>
        <View
          style={[styles.headerDivider, { backgroundColor: dividerColor }]}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Old Password */}
          <Input
            placeholder="Old Password"
            leftIcon="lock-closed-outline"
            secureTextEntry={true}
            showPasswordToggle={true}
            value={oldPassword}
            onChangeText={setOldPassword}
            containerStyle={styles.inputContainer}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="next"
            blurOnSubmit={false}
          />

          {/* New Password */}
          <Input
            placeholder="New Password"
            leftIcon="lock-closed-outline"
            secureTextEntry={true}
            showPasswordToggle={true}
            value={newPassword}
            onChangeText={setNewPassword}
            onFocus={() => setShowPasswordRequirements(true)}
            onBlur={() => setShowPasswordRequirements(false)}
            containerStyle={styles.inputContainer}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            blurOnSubmit={false}
          />

          {/* Password Requirements */}
          {showPasswordRequirements && newPassword.length > 0 && (
            <View
              style={[
                styles.passwordRequirements,
                { backgroundColor: cardBg, borderColor },
              ]}
            >
              <ThemedText
                style={[styles.requirementsTitle, { color: textColor }]}
              >
                Password Requirements:
              </ThemedText>
              {Object.entries(validatePassword(newPassword).requirements).map(
                ([key, isValid]) => (
                  <View key={key} style={styles.requirementItem}>
                    <Ionicons
                      name={isValid ? "checkmark-circle" : "ellipse-outline"}
                      size={16}
                      color={isValid ? "#4CAF50" : "#888"}
                      style={styles.requirementIcon}
                    />
                    <ThemedText
                      style={[
                        styles.requirementText,
                        { color: isValid ? "#4CAF50" : "#888" },
                      ]}
                    >
                      {key === "minLength" && "At least 8 characters"}
                      {key === "hasUppercase" && "One uppercase letter"}
                      {key === "hasLowercase" && "One lowercase letter"}
                      {key === "hasNumber" && "One number"}
                      {key === "hasSpecialChar" && "One special character"}
                    </ThemedText>
                  </View>
                )
              )}
            </View>
          )}

          {/* Confirm New Password */}
          <Input
            placeholder="Confirm New Password"
            leftIcon="lock-closed-outline"
            secureTextEntry={true}
            showPasswordToggle={true}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            containerStyle={styles.inputContainer}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
          />
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={
              saving || !oldPassword || !newPassword || !confirmPassword
            }
            style={styles.saveButton}
          />
        </View>
      </ThemedView>
    </SafeAreaView>
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
    paddingHorizontal: Spacing.xxl,
    paddingTop: 32,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 32,
  },
  saveButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  passwordRequirements: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginTop: -8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 13,
  },
});
