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
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 60,
  },
  iconWrapper: {
    backgroundColor: "#F4F8FF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  icon: {
    width: 64,
    height: 64,
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
