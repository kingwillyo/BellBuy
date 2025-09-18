import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AlertBottomSheet } from "@/components/ui/AlertBottomSheet";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface UserProfileCardProps {
  onPress?: () => void;
}

const fallbackAvatar =
  "https://ui-avatars.com/api/?name=User&background=E0E0E0&color=222&size=128";

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  onPress,
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [shareAlertVisible, setShareAlertVisible] = useState(false);

  // Theme colors using your app's design system
  const cardBackground = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const secondaryTextColor = useThemeColor(
    { light: "#666666", dark: "#CCCCCC" },
    "textSecondary"
  );
  const iconColor = useThemeColor(
    { light: "#0A84FF", dark: "#4F8EF7" },
    "tint"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333333" },
    "borderColor"
  );

  // Handle share button press
  const handleSharePress = () => {
    setShareAlertVisible(true);
  };

  // Handle alert close
  const handleAlertClose = () => {
    setShareAlertVisible(false);
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, [user]);

  // Format join date - using created_at from user metadata or profile
  const getJoinDate = () => {
    if (user?.created_at) {
      const date = new Date(user.created_at);
      const month = date.toLocaleDateString("en-US", { month: "short" });
      const year = date.getFullYear();
      return `Joined ${month}, ${year}`;
    }
    return "Joined recently";
  };

  // Get username - prioritize profile data, then fallbacks
  const getUsername = () => {
    if (profile?.full_name) {
      return profile.full_name;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return "User";
  };

  // Get avatar URL - prioritize profile data
  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      return { uri: profile.avatar_url };
    }
    if (user?.user_metadata?.avatar_url) {
      return { uri: user.user_metadata.avatar_url };
    }
    if (user?.user_metadata?.picture) {
      return { uri: user.user_metadata.picture };
    }
    return { uri: fallbackAvatar };
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBackground, borderColor }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.profileSection}>
          {/* Profile Picture */}
          <ExpoImage
            source={getAvatarUrl()}
            style={[styles.profileImage, { borderColor }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {/* User Info */}
          <View style={styles.userInfo}>
            <ThemedText type="heading" style={{ color: textColor }}>
              {getUsername()}
            </ThemedText>
            <ThemedText type="caption" style={{ color: secondaryTextColor }}>
              {getJoinDate()}
            </ThemedText>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleSharePress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={20} color={iconColor} />
          </TouchableOpacity>

          {/* Arrow Icon */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={iconColor}
            style={styles.arrow}
          />
        </View>
      </TouchableOpacity>

      {/* Share Alert */}
      <AlertBottomSheet
        visible={shareAlertVisible}
        onClose={handleAlertClose}
        title="Share Profile"
        message="This feature will be coming soon! You'll be able to share your profile with others."
        buttonText="Got it"
        variant="default"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
  },
  userInfo: {
    flex: 1,
  },
  arrow: {
    marginLeft: 8,
  },
  shareButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
});

export default UserProfileCard;
