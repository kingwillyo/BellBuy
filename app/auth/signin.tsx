import { AuthHeader } from "@/components/AuthHeader";
import { ThemedText } from "@/components/ThemedText";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spacing } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const colors = useColors();
  const router = useRouter();
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Custom Header - consistent with other screens */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          zIndex: 10,
          paddingTop: 20, // Reduced top padding
          height: 56 + 20,
          backgroundColor: "transparent",
        }}
      >
        <TouchableOpacity
          style={{
            justifyContent: "center",
            alignItems: "center",
            zIndex: 20,
            width: 40,
          }}
          onPress={() => router.replace("/")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        {/* Title removed per request */}
        <View style={{ flex: 1 }} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <AuthHeader
          title="Welcome to BellsBuy"
          subtitle="Sign in to continue"
        />
        <View style={styles.formContent}>
          <Input
            placeholder="Email"
            leftIcon="mail-outline"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            containerStyle={styles.inputContainer}
          />
          <Input
            placeholder="Password"
            leftIcon="lock-closed-outline"
            secureTextEntry={true}
            showPasswordToggle={true}
            value={password}
            onChangeText={setPassword}
            containerStyle={styles.inputContainer}
          />
          {!!errorMsg && (
            <ThemedText style={[styles.errorMsg, { color: colors.error }]}>
              {errorMsg}
            </ThemedText>
          )}
          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
            style={styles.signInButton}
          />
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => setResetModal(true)}
          >
            <ThemedText
              type="link"
              style={[styles.forgotText, { color: colors.tint }]}
            >
              Forgot Password?
            </ThemedText>
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
                  { minWidth: 260, backgroundColor: colors.cardBackground },
                ]}
              >
                <ThemedText style={styles.modalTitle}>
                  Reset Password
                </ThemedText>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: colors.text, borderColor: colors.borderColor },
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  editable={!resetLoading}
                />
                {!!resetError && (
                  <ThemedText style={{ color: colors.error, marginBottom: 8 }}>
                    {resetError}
                  </ThemedText>
                )}
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    {
                      marginBottom: 0,
                      backgroundColor: colors.tint,
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
    </KeyboardAvoidingView>
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
    paddingVertical: Spacing.xl,
  },
  formContent: {
    paddingHorizontal: Spacing.xxl,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  headerTitle: {
    textAlign: "center",
    flex: 1,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  errorMsg: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  signInButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  forgotBtn: {
    alignItems: "flex-end",
    marginBottom: Spacing.md,
  },
  forgotText: {
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
    borderRadius: 12,
    paddingVertical: 16,
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
