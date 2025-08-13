import { AuthHeader } from "@/components/AuthHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { CreateProfileData } from "@/types/profile";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const screenOptions = { headerShown: false };

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Removed gender and hostel fields
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

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
  const arrowColor = useThemeColor({}, "text");

  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      setErrorMsg("Please enter your email");
      return false;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter a password");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return false;
    }
    if (!phone.trim()) {
      setErrorMsg("Please enter your phone number");
      return false;
    }
    setErrorMsg("");
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        Alert.alert("Sign Up Error", authError.message);
        return;
      }

      if (!authData.user) {
        Alert.alert("Error", "Failed to create user account");
        return;
      }

      // Step 2: Insert profile data into profiles table
      const profileData: CreateProfileData = {
        id: authData.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (profileError) {
        Alert.alert("Profile Error", profileError.message);
        return;
      }

      // Success!
      Alert.alert(
        "Success!",
        "Account created successfully. Please check your email to verify your account.",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/signin"),
          },
        ]
      );
    } catch (error) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
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
          onPress={() => router.push("/auth/signin")}
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
          Sign Up
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <AuthHeader title="" subtitle="Create a new account" />
        <View style={styles.formContent}>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: inputBackground, borderColor },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Full Name"
              placeholderTextColor="#888"
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: inputBackground, borderColor },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Your Email"
              placeholderTextColor="#888"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: inputBackground, borderColor },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: inputBackground, borderColor },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Password Again"
              placeholderTextColor="#888"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: inputBackground, borderColor },
            ]}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={accent}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: textColor }]}
              placeholder="Phone Number"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          {!!errorMsg && (
            <ThemedText style={styles.errorMsg}>{errorMsg}</ThemedText>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.buttonText}>
              {loading ? "Creating Account..." : "Sign Up"}
            </ThemedText>
          </TouchableOpacity>
          <View style={styles.bottomRow}>
            <ThemedText style={styles.bottomText}>have a account? </ThemedText>
            <TouchableOpacity onPress={() => router.push("/auth/signin")}>
              <ThemedText style={styles.linkText}>Sign In</ThemedText>
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
    marginBottom: 24,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  pickerContainer: {
    display: "none",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  linkButton: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  linkText: {
    color: "#0A84FF",
    fontWeight: "bold",
    fontSize: 15,
  },
  errorMsg: {
    color: "#EA4335",
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
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
});
