import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase, uploadProfileImageToStorage } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const localDefaultAvatar = require("../../assets/images/icon.png");

export default function ProfileScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const [editingGender, setEditingGender] = useState(false);
  const [genderLoading, setGenderLoading] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Move all theme hooks to the top
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const iconColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "icon"
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

  // Theme-aware modal/option colors
  const modalBg = useThemeColor(
    { light: "#fff", dark: "#181A20" },
    "background"
  );
  const modalText = useThemeColor({ light: "#222", dark: "#ECEDEE" }, "text");
  const modalOptionBg = useThemeColor(
    { light: "#F5F5F5", dark: "#23262F" },
    "background"
  );
  const modalOptionSelectedBg = useThemeColor(
    { light: "#E0E7FF", dark: "#2D3A5A" },
    "background"
  );
  const modalCancelBg = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );
  const modalCancelText = useThemeColor(
    { light: "#888", dark: "#AAA" },
    "text"
  );

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

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
        alert(e.message || "Failed to upload image");
      } finally {
        setUploading(false);
      }
    }
  };

  // Handler for updating gender
  const handleUpdateGender = async (newGender: string) => {
    setGenderLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ gender: newGender })
        .eq("id", user!.id);
      if (error) throw error;
      setProfile((prev: any) => ({ ...prev, gender: newGender }));
      setEditingGender(false);
    } catch (e: any) {
      alert(e.message || "Failed to update gender");
    } finally {
      setGenderLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in both fields");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setChangePasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password changed successfully.");
    } catch (e: any) {
      setPasswordError(e.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.headerRow}>
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
        {/* Skeleton Loader */}
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
                        onPress={() => setEditingGender(true)}
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
                      {/* Gender Edit Modal */}
                      <Modal
                        visible={editingGender}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setEditingGender(false)}
                      >
                        <View style={styles.modalOverlay}>
                          <View
                            style={[
                              styles.modalContent,
                              {
                                backgroundColor: modalBg,
                                shadowOpacity: 0,
                                borderRadius: 10,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[styles.modalTitle, { color: modalText }]}
                            >
                              Select Gender
                            </ThemedText>
                            {["Male", "Female"].map((option) => (
                              <Pressable
                                key={option}
                                style={[
                                  styles.modalOption,
                                  {
                                    backgroundColor:
                                      profile?.gender === option
                                        ? modalOptionSelectedBg
                                        : modalOptionBg,
                                    borderWidth:
                                      profile?.gender === option ? 1.5 : 0,
                                    borderColor:
                                      profile?.gender === option
                                        ? accent
                                        : "transparent",
                                    borderRadius: 8,
                                    shadowOpacity: 0,
                                  },
                                ]}
                                onPress={() => handleUpdateGender(option)}
                                disabled={genderLoading}
                              >
                                <ThemedText
                                  style={[
                                    styles.modalOptionText,
                                    {
                                      color: modalText,
                                      fontWeight:
                                        profile?.gender === option
                                          ? "bold"
                                          : "500",
                                    },
                                  ]}
                                >
                                  {option}
                                </ThemedText>
                              </Pressable>
                            ))}
                            <Pressable
                              style={[
                                styles.modalCancel,
                                {
                                  backgroundColor: modalCancelBg,
                                  borderRadius: 8,
                                  shadowOpacity: 0,
                                },
                              ]}
                              onPress={() => setEditingGender(false)}
                              disabled={genderLoading}
                            >
                              <ThemedText
                                style={[
                                  styles.modalCancelText,
                                  { color: modalCancelText },
                                ]}
                              >
                                Cancel
                              </ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      </Modal>
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
                        onPress={() => setChangePasswordModal(true)}
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
                      {/* Change Password Modal */}
                      <Modal
                        visible={changePasswordModal}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setChangePasswordModal(false)}
                      >
                        <View style={styles.modalOverlay}>
                          <View
                            style={[
                              styles.modalContent,
                              { minWidth: 260, backgroundColor: modalBg },
                            ]}
                          >
                            <ThemedText
                              style={[styles.modalTitle, { color: modalText }]}
                            >
                              Change Password
                            </ThemedText>
                            <TextInput
                              style={[
                                styles.modalInput,
                                { color: textColor, borderColor: border },
                              ]}
                              placeholder="New Password"
                              placeholderTextColor="#888"
                              secureTextEntry
                              value={newPassword}
                              onChangeText={setNewPassword}
                              editable={!passwordLoading}
                            />
                            <TextInput
                              style={[
                                styles.modalInput,
                                { color: textColor, borderColor: border },
                              ]}
                              placeholder="Confirm Password"
                              placeholderTextColor="#888"
                              secureTextEntry
                              value={confirmPassword}
                              onChangeText={setConfirmPassword}
                              editable={!passwordLoading}
                            />
                            {!!passwordError && (
                              <ThemedText
                                style={{ color: "#FF3B30", marginBottom: 8 }}
                              >
                                {passwordError}
                              </ThemedText>
                            )}
                            <TouchableOpacity
                              style={[
                                styles.modalOption,
                                {
                                  marginBottom: 0,
                                  backgroundColor: accent,
                                  borderRadius: 8,
                                },
                              ]}
                              onPress={handleChangePassword}
                              disabled={passwordLoading}
                              activeOpacity={0.8}
                            >
                              <ThemedText
                                style={[
                                  styles.modalOptionText,
                                  { color: "#fff", fontWeight: "bold" },
                                ]}
                              >
                                Change Password
                              </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.modalCancel, { borderRadius: 8 }]}
                              onPress={() => setChangePasswordModal(false)}
                              disabled={passwordLoading}
                              activeOpacity={0.8}
                            >
                              <ThemedText style={styles.modalCancelText}>
                                Cancel
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Modal>
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
    textAlign: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    minWidth: 220,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#222",
  },
  modalOption: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F0F0F0",
    width: "100%",
    alignItems: "center",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#222",
  },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#EEE",
    width: "100%",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    color: "#888",
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "transparent",
  },
});
