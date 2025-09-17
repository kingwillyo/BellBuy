import { BorderRadius, Spacing } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { BottomSheet, BottomSheetOption } from "./ui/BottomSheet";
import { Button } from "./ui/Button";

export function BottomSheetExample() {
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const colors = useColors();

  const options: BottomSheetOption[] = [
    {
      id: "report",
      title: "Report this item",
      subtitle: "Price gouging, prohibited item etc",
      icon: "flag-outline",
      onPress: () => {
        console.log("Report item pressed");
        // Handle report action
      },
      variant: "warning",
    },
    {
      id: "how-it-works",
      title: "How it works",
      subtitle: "Learn how to buy or sell on Rensa",
      icon: "book-outline",
      onPress: () => {
        console.log("How it works pressed");
        // Handle how it works action
      },
    },
    {
      id: "contact-support",
      title: "Contact support",
      subtitle: "Need help with this item?",
      icon: "help-circle-outline",
      onPress: () => {
        console.log("Contact support pressed");
        // Handle contact support action
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText style={styles.title}>Bottom Sheet Example</ThemedText>
      <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
        Tap the button below to see the bottom sheet in action
      </ThemedText>

      <Button
        title="Show More Options"
        onPress={() => setShowBottomSheet(true)}
        rightIcon={<Ionicons name="chevron-up" size={16} color="white" />}
        style={styles.button}
      />

      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="More options"
        options={options}
        enablePanDownToClose={true}
        enableBackdropToClose={true}
        showHandle={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.lg,
  },
});
