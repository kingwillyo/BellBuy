import { AuthHeader } from "@/components/AuthHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const screenOptions = { headerShown: false };

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const textColor = useThemeColor({}, "text");
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "background"
  );
  const inputBackground = useThemeColor(
    { light: "#F7F7F7", dark: "#23262F" },
    "background"
  );
  const router = useRouter();
  const arrowColor = useThemeColor({}, "text");
  const [errorMsg, setErrorMsg] = useState("");
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setErrorMsg(error.message || "Sign in failed");
    else router.replace("/");
  };

  const handleSendReset = async () => {
    setResetError("");
    if (!resetEmail.trim()) {
      setResetError("Please enter your email");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim()
      );
      if (error) throw error;
      setResetModal(false);
      setResetEmail("");
      Alert.alert(
        "Success",
        "Password reset email sent. Please check your inbox."
      );
    } catch (e: any) {
      setResetError(e.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  // Add theme-aware modal colors
  const modalBg = useThemeColor(
    { light: "#fff", dark: "#181A20" },
    "background"
  );
  const modalText = useThemeColor({ light: "#222", dark: "#ECEDEE" }, "text");
  const modalCancelBg = useThemeColor(
    { light: "#E5E5E5", dark: "#23262F" },
    "background"
  );
  const modalCancelText = useThemeColor(
    { light: "#222", dark: "#ECEDEE" },
    "text"
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader title="Sign In" subtitle="Sign in to continue" />
        <View style={styles.formContent}>
          <View
            style={[styles.inputWrapper, { backgroundColor: inputBackground }]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder="Email"
              placeholderTextColor="#888"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View
            style={[styles.inputWrapper, { backgroundColor: inputBackground }]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          {!!errorMsg && (
            <ThemedText style={styles.errorMsg}>{errorMsg}</ThemedText>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? "Signing In..." : "Sign In"}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => setResetModal(true)}
          >
            <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
          </TouchableOpacity>
          <Modal
            visible={resetModal}
            transparent
            animationType="fade"
            onRequestClose={() => setResetModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalContent,
                  { minWidth: 260, backgroundColor: modalBg },
                ]}
              >
                <ThemedText style={styles.modalTitle}>
                  Reset Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: textColor, borderColor: borderColor },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor="#888"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  editable={!resetLoading}
                />
                {!!resetError && (
                  <ThemedText style={{ color: "#FF3B30", marginBottom: 8 }}>
                    {resetError}
                  </ThemedText>
                )}
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    {
                      marginBottom: 0,
                      backgroundColor: accent,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                  onPress={handleSendReset}
                  disabled={resetLoading}
                  activeOpacity={0.8}
                >
                  {resetLoading && (
                    <ActivityIndicator
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <ThemedText
                    style={[
                      styles.modalOptionText,
                      { color: "#fff", fontWeight: "bold" },
                    ]}
                  >
                    Send Reset Email
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCancel, { borderRadius: 8 }]}
                  onPress={() => setResetModal(false)}
                  disabled={resetLoading}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <ThemedText style={styles.orText}>OR</ThemedText>
            <View style={styles.divider} />
          </View>
          <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
            <Ionicons
              name="logo-google"
              size={20}
              color="#EA4335"
              style={styles.socialIcon}
            />
            <ThemedText style={styles.socialText}>Login with Google</ThemedText>
          </TouchableOpacity>
          <View style={styles.bottomRow}>
            <ThemedText style={styles.bottomText}>
              Don’t have an account?{" "}
            </ThemedText>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <ThemedText style={styles.linkText}>Register</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Back Arrow - positioned higher to avoid gesture interference */}
      <TouchableOpacity
        onPress={() => router.replace("/")}
        style={{ position: "absolute", top: 60, left: 20, zIndex: 2 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={arrowColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  formContent: {
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  errorMsg: {
    color: "#EA4335",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  forgotBtn: {
    alignItems: "flex-end",
    marginBottom: 12,
  },
  forgotText: {
    color: "#0A84FF",
    fontWeight: "600",
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  orText: {
    marginHorizontal: 10,
    color: "#888",
    fontWeight: "600",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  socialIcon: {
    marginRight: 12,
  },
  socialText: {
    fontSize: 15,
    color: "#222",
    fontWeight: "600",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  bottomText: {
    color: "#888",
    fontSize: 15,
  },
  linkText: {
    color: "#0A84FF",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  modalOption: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalOptionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalCancel: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E5E5",
    marginTop: 10,
  },
  modalCancelText: {
    color: "#222",
    fontWeight: "bold",
  },
});
