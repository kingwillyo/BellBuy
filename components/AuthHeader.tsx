import { ThemedText } from "@/components/ThemedText";
import React from "react";
import { Image, StyleSheet, View } from "react-native";

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.iconWrapper}>
        {/* Placeholder for app icon, replace source with your own icon if needed */}
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      {title && <ThemedText style={styles.title}>{title}</ThemedText>}
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20, // Reduced top margin since we now have a header
  },
  iconWrapper: {
    backgroundColor: "#F4F8FF",
    borderRadius: 24,
    padding: 16, // Reduced padding for better proportion
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    width: 88, // Slightly larger for better visibility
    height: 88, // Slightly larger for better visibility
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 0,
    textAlign: "center",
    fontWeight: "500",
  },
});
