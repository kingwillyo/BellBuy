import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Spacing, Typography } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
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

const feedbackSubjects = [
  "Buying",
  "Selling",
  "Payments",
  "Delivery",
  "Checkout",
  "Onboarding",
  "Others",
];

export default function FeedbackScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert("Required", "Please share your feedback before submitting.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to submit feedback.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          subjects: selectedSubjects,
          feedback_text: feedbackText.trim(),
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error submitting feedback:", error);
        Alert.alert("Error", "Failed to submit feedback. Please try again.");
        return;
      }

      Alert.alert(
        "Thank you!",
        "Your feedback has been submitted successfully. We appreciate your input!",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Unexpected error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = !feedbackText.trim() || isSubmitting;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header title="Share your feedback" showBackButton />

      {/* Submit Button - Fixed at bottom */}
      <View
        style={[
          styles.submitContainer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Button
          title="Submit"
          onPress={handleSubmit}
          variant={isSubmitDisabled ? "secondary" : "primary"}
          disabled={isSubmitDisabled}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={styles.content}>
            {/* Introduction Text */}
            <ThemedText style={styles.introText}>
              We're all ears at BellBuy! Love a feature or have an idea to make
              buying and selling secondhand more secure and better?
            </ThemedText>

            {/* Feedback Subject Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Feedback subject
              </ThemedText>

              <View style={styles.subjectsGrid}>
                {feedbackSubjects.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject);
                  return (
                    <TouchableOpacity
                      key={subject}
                      style={[
                        styles.subjectButton,
                        {
                          backgroundColor: isSelected
                            ? colors.tint
                            : colors.background,
                          borderColor: isSelected
                            ? colors.tint
                            : colors.borderColor,
                        },
                      ]}
                      onPress={() => toggleSubject(subject)}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.subjectButtonText,
                          {
                            color: isSelected ? "#FFFFFF" : colors.text,
                            fontWeight: isSelected ? "600" : "500",
                          },
                        ]}
                      >
                        {subject}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Feedback Input Section */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>
                Share feedback here
              </ThemedText>

              <View
                style={[
                  styles.textInputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                    },
                  ]}
                  placeholder="Tell us what you like, or what we can improve."
                  placeholderTextColor={colors.textTertiary}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
              </View>

              <ThemedText
                style={[styles.characterCount, { color: colors.textTertiary }]}
              >
                {feedbackText.length}/1000 characters
              </ThemedText>
            </View>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for fixed submit button
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  introText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.4,
    marginBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  subjectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  subjectButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  subjectButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
  },
  textInputContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 120,
  },
  textInput: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.4,
    flex: 1,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: Typography.sizes.xs,
    textAlign: "right",
    marginTop: Spacing.sm,
  },
  submitContainer: {
    position: "absolute",
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    zIndex: 10,
  },
  submitButton: {
    width: "100%",
  },
});
