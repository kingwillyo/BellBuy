import React from "react";
import { StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";

interface AvatarProps {
  uri?: string;
  size?: number;
  style?: any;
}

const fallbackAvatar = "https://ui-avatars.com/api/?name=User&background=E0E0E0&color=222&size=128";

export const Avatar: React.FC<AvatarProps> = ({ uri, size = 48, style }) => {
  return (
    <View style={[styles.avatarContainer, { width: size, height: size }, style]}>
      <ExpoImage
        source={{ uri: uri || fallbackAvatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
        cachePolicy="memory-disk"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Avatar;