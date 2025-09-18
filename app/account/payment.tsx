import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, View } from "react-native";

const dummyPayments = [
  { id: "1", type: "Card", detail: "**** 1234" },
  { id: "2", type: "MTN Mobile Money", detail: "0701 234 5678" },
];

export default function PaymentScreen() {
  const { user, isLoading } = useAuth();

  // Always call hooks before any early returns
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");

  // Show loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Return null if not authenticated (redirect will be triggered by useAuth)
  if (!user) {
    return null;
  }
  return (
    <ThemedView style={styles.container}>
      {dummyPayments.map((item) => (
        <View key={item.id} style={[styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={[styles.type, { color: accent }]}>
            {item.type}
          </ThemedText>
          <ThemedText style={[styles.detail, { color: textColor }]}>
            {item.detail}
          </ThemedText>
        </View>
      ))}
      <View
        style={[styles.card, { backgroundColor: cardBg, alignItems: "center" }]}
      >
        <ThemedText style={[styles.placeholder, { color: "#888" }]}>
          Add Payment Method (coming soon)
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "transparent",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  type: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detail: {
    fontSize: 16,
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 15,
    fontStyle: "italic",
  },
});
