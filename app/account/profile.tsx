import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useFollowCounts } from "@/hooks/useFollow";
import { useThemeColor } from "@/hooks/useThemeColor";
import { handleNetworkError } from "@/lib/networkUtils";
import { supabase, uploadProfileImageToStorage } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
const localDefaultAvatar = require("../../assets/images/icon.png");

export default function ProfileScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [genderLoading, setGenderLoading] = useState(false);
  const {
    followers,
    following,
    refresh: refreshCounts,
  } = useFollowCounts(user?.id);

  // Move all theme hooks to the top
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const iconColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "tint"
  );
  const dividerColor = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );
  const border = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );
  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";
  const skeletonColor = isDarkMode ? "#151718" : "#e8e9eb";

  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data);
    } catch (err: any) {
      handleNetworkError(err, {
        context: "loading profile",
        onRetry: fetchProfile,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    refreshCounts();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchProfile();
      }
    }, [user])
  );

  // Username fallback: use email before @ if no username
  const username =
    profile?.username || (user?.email ? `@${user.email.split("@")[0]}` : "");

  // Profile fields for the card/list
  const fields = [
    {
      key: "gender",
      label: "Gender",
      icon: "male-outline",
      value: profile?.gender || "",
    },
    {
      key: "level",
      label: "Level",
      icon: "school-outline",
      value: profile?.level || "",
    },
    {
      key: "department",
      label: "Department",
      icon: "library-outline",
      value: profile?.department || "",
    },
    profile?.birthday && {
      key: "birthday",
      label: "Birthday",
      icon: "calendar-outline",
      value: profile.birthday,
    },
    {
      key: "email",
      label: "Email",
      icon: "mail-outline",
      value: user?.email,
    },
    {
      key: "phone",
      label: "Phone Number",
      icon: "call-outline",
      value: profile?.phone || "",
    },
    {
      key: "password",
      label: "Change Password",
      icon: "lock-closed-outline",
      value: "••••••••••••",
    },
  ].filter(Boolean);

  // Handler for picking and uploading a new profile image
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission required to access photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      try {
        if (!user) {
          throw new Error("User not found");
        }
        const uri = result.assets[0].uri;
        const oldImageUrl = profile?.avatar_url;
        const url = await uploadProfileImageToStorage(uri, user.id);
        // Update profile row in Supabase
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: url })
          .eq("id", user.id);
        if (error) throw error;
        setProfile((prev: any) => ({ ...prev, avatar_url: url }));
        // Delete old image if it exists and is a Supabase Storage URL
        if (
          oldImageUrl &&
          oldImageUrl.includes("/storage/v1/object/public/profile-images/")
        ) {
          const filePath = oldImageUrl.split(
            "/storage/v1/object/public/profile-images/"
          )[1];
          if (filePath) {
            await supabase.storage.from("profile-images").remove([filePath]);
          }
        }
      } catch (e: any) {
        handleNetworkError(e, {
          context: "uploading profile image",
          onRetry: handlePickImage,
        });
      } finally {
        setUploading(false);
      }
    }
  };

  // Handler for navigating to gender edit page
  const handleEditGender = () => {
    router.push("/account/edit-gender");
  };

  // Handler for navigating to level edit page
  const handleEditLevel = () => {
    router.push("/account/edit-level");
  };

  // Handler for navigating to department edit page
  const handleEditDepartment = () => {
    router.push("/account/edit-department");
  };

  // Handler for navigating to password change page
  const handleChangePassword = () => {
    router.push("/account/change-password");
  };

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
            Profile
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>
        {/* Remove extra spacer to match other pages */}
        <View style={{ height: 0 }} />
        {/* Loading with safe view */}
        {!authLoading && loading && (
          <View style={{ paddingHorizontal: 16, marginTop: 32 }}>
            {/* Avatar Skeleton */}
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: skeletonColor,
                  marginBottom: 12,
                }}
              />
              <View
                style={{
                  width: 120,
                  height: 18,
                  borderRadius: 8,
                  backgroundColor: skeletonColor,
                  marginBottom: 8,
                }}
              />
              <View
                style={{
                  width: 80,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: skeletonColor,
                }}
              />
            </View>
            {/* Card Skeleton */}
            <View
              style={[styles.card, { backgroundColor: cardBg, minHeight: 180 }]}
            >
              {[1, 2, 3, 4].map((_, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 18,
                    paddingHorizontal: 20,
                    borderBottomWidth: i < 3 ? 1 : 0,
                    borderBottomColor: dividerColor,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: skeletonColor,
                      marginRight: 16,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        width: "60%",
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: skeletonColor,
                        marginBottom: 6,
                      }}
                    />
                    <View
                      style={{
                        width: "40%",
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: skeletonColor,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
            {/* Sign Out Button Skeleton */}
            <View
              style={{
                height: 48,
                borderRadius: 12,
                backgroundColor: skeletonColor,
                marginHorizontal: 24,
                marginBottom: 32,
                marginTop: 0,
              }}
            />
          </View>
        )}
        {/* Only render profile content if not loading and user exists */}
        {!authLoading && !loading && user && (
          <>
            <View style={styles.avatarSectionRow}>
              <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
                <ExpoImage
                  source={
                    profile?.avatar_url
                      ? profile.avatar_url
                      : localDefaultAvatar
                  }
                  style={styles.avatar}
                  contentFit="cover"
                  transition={300}
                  cachePolicy="memory-disk"
                />
                {uploading && (
                  <View style={styles.avatarOverlay}>
                    <ThemedText style={styles.avatarOverlayText}>
                      Uploading...
                    </ThemedText>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.avatarNameBlock}>
                <ThemedText style={[styles.name, { color: textColor }]}>
                  {profile?.full_name || ""}
                </ThemedText>
                <ThemedText style={[styles.username, { color: accent }]}>
                  {username}
                </ThemedText>
                {/* Followers / Following counts */}
                <View style={{ flexDirection: "row", marginTop: 6 }}>
                  <TouchableOpacity
                    onPress={() => router.push("/account/followers")}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 12 }}
                  >
                    <ThemedText style={{ color: textColor, fontWeight: "600" }}>
                      Followers: {followers}
                    </ThemedText>
                  </TouchableOpacity>
                  <View style={{ width: 12 }} />
                  <TouchableOpacity
                    onPress={() => router.push("/account/following")}
                    hitSlop={{ top: 6, bottom: 6, left: 12, right: 6 }}
                  >
                    <ThemedText style={{ color: textColor, fontWeight: "600" }}>
                      Following: {following}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: cardBg }]}>
              {fields.map((field, idx) => {
                if (field.key === "gender") {
                  return (
                    <View
                      key={field.key}
                      style={[
                        styles.row,
                        { borderBottomColor: dividerColor },
                        idx === fields.length - 1
                          ? { borderBottomWidth: 0 }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={field.icon as any}
                        size={22}
                        color={iconColor}
                        style={styles.rowIcon}
                      />
                      <ThemedText
                        style={[styles.rowLabel, { color: textColor }]}
                      >
                        {field.label}
                      </ThemedText>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center" }}
                        onPress={handleEditGender}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ThemedText
                          style={[
                            styles.rowValue,
                            { color: textColor, marginRight: 4 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {profile?.gender || ""}
                        </ThemedText>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={iconColor}
                          style={styles.chevron}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (field.key === "level") {
                  return (
                    <View
                      key={field.key}
                      style={[
                        styles.row,
                        { borderBottomColor: dividerColor },
                        idx === fields.length - 1
                          ? { borderBottomWidth: 0 }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={field.icon as any}
                        size={22}
                        color={iconColor}
                        style={styles.rowIcon}
                      />
                      <ThemedText
                        style={[styles.rowLabel, { color: textColor }]}
                      >
                        {field.label}
                      </ThemedText>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center" }}
                        onPress={handleEditLevel}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ThemedText
                          style={[
                            styles.rowValue,
                            { color: textColor, marginRight: 4 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {profile?.level || ""}
                        </ThemedText>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={iconColor}
                          style={styles.chevron}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (field.key === "department") {
                  return (
                    <View
                      key={field.key}
                      style={[
                        styles.row,
                        { borderBottomColor: dividerColor },
                        idx === fields.length - 1
                          ? { borderBottomWidth: 0 }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={field.icon as any}
                        size={22}
                        color={iconColor}
                        style={styles.rowIcon}
                      />
                      <ThemedText
                        style={[styles.rowLabel, { color: textColor }]}
                      >
                        {field.label}
                      </ThemedText>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center" }}
                        onPress={handleEditDepartment}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ThemedText
                          style={[
                            styles.rowValue,
                            { color: textColor, marginRight: 4 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {profile?.department || ""}
                        </ThemedText>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={iconColor}
                          style={styles.chevron}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }
                if (field.key === "password") {
                  return (
                    <View
                      key={field.key}
                      style={[
                        styles.row,
                        { borderBottomColor: dividerColor },
                        idx === fields.length - 1
                          ? { borderBottomWidth: 0 }
                          : {},
                      ]}
                    >
                      <Ionicons
                        name={field.icon as any}
                        size={22}
                        color={iconColor}
                        style={styles.rowIcon}
                      />
                      <ThemedText
                        style={[styles.rowLabel, { color: textColor }]}
                      >
                        {field.label}
                      </ThemedText>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center" }}
                        onPress={handleChangePassword}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ThemedText
                          style={[
                            styles.rowValue,
                            { color: textColor, marginRight: 4 },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {field.value}
                        </ThemedText>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={iconColor}
                          style={styles.chevron}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }
                // Default row rendering for other fields
                return (
                  <TouchableOpacity
                    key={field.key}
                    style={[
                      styles.row,
                      { borderBottomColor: dividerColor },
                      idx === fields.length - 1 ? { borderBottomWidth: 0 } : {},
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={field.icon as any}
                      size={22}
                      color={iconColor}
                      style={styles.rowIcon}
                    />
                    <ThemedText style={[styles.rowLabel, { color: textColor }]}>
                      {field.label}
                    </ThemedText>
                    <View style={{ flex: 1 }} />
                    <ThemedText
                      style={[styles.rowValue, { color: textColor }]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {field.value}
                    </ThemedText>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={iconColor}
                      style={styles.chevron}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Sign Out Button */}
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: accent }]}
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace("/");
              }}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  headerBack: {
    width: 26,
    color: "#0A84FF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 22,
    color: "#fff",
  },
  avatarSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  avatarNameBlock: {
    marginLeft: 18,
    justifyContent: "center",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#f0f0f0",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "left",
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "left",
  },
  card: {
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "transparent",
  },
  rowIcon: {
    marginRight: 16,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 90,
    alignSelf: "center",
    textAlignVertical: "center",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "500",
    marginRight: 8,
    textAlign: "right",
    alignSelf: "center",
    textAlignVertical: "center",
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 2,
  },
  signOutButton: {
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 32,
    marginTop: 0,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 60,
  },
  avatarOverlayText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
