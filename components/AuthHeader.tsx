import { ThemedText } from "@/components/ThemedText";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

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
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.icon}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
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
    width: 120,
    height: 120,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 0,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 0,
    textAlign: "center",
    fontWeight: "400",
  },
});
