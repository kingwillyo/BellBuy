import { AuthHeader } from "@/components/AuthHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { handleNetworkError } from "@/lib/networkUtils";
import { supabase } from "@/lib/supabase";
import { CreateProfileData, University } from "@/types/profile";
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
import { SafeAreaView } from "react-native-safe-area-context";

export const screenOptions = { headerShown: false };

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);

  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const textColor = useThemeColor({}, "text");
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "borderColor"
  );
  const inputBackground = useThemeColor(
    { light: "#F7F7F7", dark: "#23262F" },
    "background"
  );
  const arrowColor = useThemeColor({}, "text");

  // Fetch universities on component mount
  React.useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      const { data, error } = await supabase
        .from("universities")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setUniversities(data || []);

      // Don't auto-select any university - let user choose
    } catch (error) {
      console.error("Error fetching universities:", error);
    }
  };

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
    if (!selectedUniversity) {
      setErrorMsg("Please select your university");
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
        options: {
          data: {
            full_name: fullName.trim(),
            gender,
            university_id: selectedUniversity,
          },
        },
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
        gender: gender,
        university_id: selectedUniversity,
      };

      // If a session exists, ensure a profile row is created via RPC (RLS safe)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const { error: rpcError } = await supabase.rpc(
          "create_profile_if_not_exists",
          {
            p_full_name: profileData.full_name,
            p_gender: profileData.gender,
            p_university_id: profileData.university_id,
          }
        );
        if (rpcError) {
          Alert.alert("Profile Error", rpcError.message);
          return;
        }
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
      handleNetworkError(error, {
        context: "creating account",
        onRetry: handleSignUp,
      });
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
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
            paddingTop: 0, // SafeAreaView handles top padding
            height: 56,
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
            title="Let's Get Started"
            subtitle="Create a new account"
          />
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
            {/* University Dropdown */}
            <View style={styles.dropdownContainer}>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: inputBackground, borderColor },
                ]}
              >
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={accent}
                  style={styles.inputIcon}
                />
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() =>
                    setShowUniversityDropdown(!showUniversityDropdown)
                  }
                >
                  <ThemedText
                    style={[
                      styles.dropdownText,
                      { color: selectedUniversity ? textColor : "#888" },
                    ]}
                  >
                    {selectedUniversity
                      ? universities.find((u) => u.id === selectedUniversity)
                          ?.name || "Select University"
                      : "Select University"}
                  </ThemedText>
                  <Ionicons
                    name={
                      showUniversityDropdown ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={accent}
                  />
                </TouchableOpacity>
              </View>

              {/* University Dropdown List */}
              {showUniversityDropdown && (
                <View
                  style={[
                    styles.dropdownList,
                    { backgroundColor: cardBg, borderColor },
                  ]}
                >
                  {universities.map((university) => (
                    <TouchableOpacity
                      key={university.id}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            selectedUniversity === university.id
                              ? accent + "20"
                              : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setSelectedUniversity(university.id);
                        setShowUniversityDropdown(false);
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.dropdownItemText,
                          {
                            color:
                              selectedUniversity === university.id
                                ? accent
                                : textColor,
                          },
                        ]}
                      >
                        {university.name}
                      </ThemedText>
                      {selectedUniversity === university.id && (
                        <Ionicons name="checkmark" size={20} color={accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
              <ThemedText style={styles.bottomText}>
                have a account?{" "}
              </ThemedText>
              <TouchableOpacity onPress={() => router.push("/auth/signin")}>
                <ThemedText style={styles.linkText}>Sign In</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: Spacing.xl,
  },
  formContent: {
    paddingHorizontal: Spacing.xxl,
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
    marginBottom: Spacing.lg,
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
  dropdownContainer: {
    position: "relative",
    zIndex: 1000,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  pickerContainer: {
    display: "none",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
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
    marginTop: Spacing.sm,
  },
  bottomText: {
    color: "#888",
    fontSize: 15,
  },
});
