import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

interface VerificationCodeInputProps {
  orderId: number;
  onVerificationSuccess?: () => void;
  currentStatus: string;
}

export function VerificationCodeInput({
  orderId,
  onVerificationSuccess,
  currentStatus,
}: VerificationCodeInputProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackgroundColor = useThemeColor(
    { light: Colors.light.cardBackground, dark: Colors.dark.cardBackground },
    "background"
  );
  const borderColor = useThemeColor(
    { light: Colors.light.borderColor, dark: Colors.dark.borderColor },
    "background"
  );

  const canVerify = currentStatus === "confirmed";

  const handleVerification = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter a verification code");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to verify orders");
      return;
    }

    setLoading(true);

    try {
      console.log("Calling verify-code function with:", {
        verification_code: verificationCode.trim(),
        order_id: orderId,
        seller_id: user.id,
      });

      const { data, error } = await supabase.functions.invoke(
        "verify-code-final",
        {
          body: {
            verification_code: verificationCode.trim(),
            order_id: orderId,
            seller_id: user.id,
          },
        }
      );

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Verification error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        Alert.alert("Error", error.message || "Failed to verify code");
        return;
      }

      if (data?.success) {
        Alert.alert(
          "Success!",
          "Order completed successfully! Payout has been initiated.",
          [
            {
              text: "OK",
              onPress: () => {
                setVerificationCode("");
                onVerificationSuccess?.();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", data?.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!canVerify) {
    return (
      <View
        style={[styles.container, { backgroundColor: cardBackgroundColor }]}
      >
        <Text style={[styles.title, { color: textColor }]}>
          Verification Code
        </Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          Order must be confirmed to verify delivery
        </Text>
        <Text style={[styles.status, { color: textColor }]}>
          Current Status: {currentStatus}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBackgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>Verify Delivery</Text>
      <Text style={[styles.subtitle, { color: textColor }]}>
        Enter the verification code provided by the buyer to complete this order
      </Text>

      <Input
        placeholder="Enter 6-digit code"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="numeric"
        maxLength={6}
        style={styles.input}
      />

      <Button
        title={loading ? "Verifying..." : "Verify Delivery"}
        onPress={handleVerification}
        disabled={loading || !verificationCode.trim()}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    opacity: 0.7,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  status: {
    fontSize: Typography.sizes.sm,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.md,
  },
  button: {
    marginTop: Spacing.sm,
  },
});
