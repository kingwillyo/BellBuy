import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers } from "@/hooks/useFollow";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function FollowersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const targetUserId = userId || user?.id;
  const { items, loading, refresh } = useFollowers(targetUserId);
  const insets = useSafeAreaInsets();
  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";

  // Theme colors
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "tint"
  );
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const dividerColor = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDarkMode ? undefined : "#FFFFFF" }}
      edges={["left", "right"]}
    >
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
        backgroundColor={isDarkMode ? undefined : "#FFFFFF"}
      />
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Header (flash-sale style) */}
        <View
          style={[
            styles.headerRow,
            {
              paddingTop: insets.top,
              height: 56 + insets.top,
              backgroundColor: headerBackgroundColor,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons name="arrow-back" size={26} color={iconColor} />
          </TouchableOpacity>
          <ThemedText
            type="title"
            style={[styles.headerTitle, { color: textColor }]}
            numberOfLines={1}
          >
            Followers
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          onRefresh={refresh}
          refreshing={loading}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/seller/${item.id}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://via.placeholder.com/80x80?text=Avatar",
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.name, { color: textColor }]}>
                  {item.full_name || "Unnamed"}
                </ThemedText>
                <ThemedText style={[styles.email, { color: textColor }]}>
                  {item.email || ""}
                </ThemedText>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={iconColor} />
                <ThemedText style={[styles.emptyTitle, { color: textColor }]}>
                  No followers yet
                </ThemedText>
                <ThemedText style={[styles.emptyMessage, { color: textColor }]}>
                  When people follow you, they will appear here.
                </ThemedText>
              </View>
            ) : null
          }
          contentContainerStyle={
            items.length === 0 ? styles.emptyFlex : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  headerBack: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { fontSize: 16, fontWeight: "600" },
  email: { fontSize: 13, opacity: 0.7 },
  emptyFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: "bold", marginTop: 12 },
  emptyMessage: { fontSize: 14, textAlign: "center", marginTop: 6 },
});
