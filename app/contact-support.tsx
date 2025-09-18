import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { AlertBottomSheet } from "@/components/ui/AlertBottomSheet";
import { BorderRadius, Colors, Spacing } from "@/constants/Colors";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";

interface ContactOptionProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

const ContactOption: React.FC<ContactOptionProps> = ({
  icon,
  title,
  subtitle,
  onPress,
}) => {
  const colors = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const dividerColor = useThemeColor({}, "divider");
  const secondaryTextColor = useThemeColor({}, "textSecondary");

  return (
    <Pressable
      style={({ pressed }) => [
        styles.contactOption,
        {
          backgroundColor,
          borderBottomColor: dividerColor,
        },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.contactOptionContent}>
        <View
          style={[styles.iconContainer, { backgroundColor: Colors.light.tint }]}
        >
          <Ionicons name={icon as any} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={[styles.optionTitle, { color: colors }]}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText
              style={[styles.optionSubtitle, { color: secondaryTextColor }]}
            >
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => {
  const colors = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");

  return (
    <View style={[styles.sectionHeader, { backgroundColor }]}>
      <ThemedText style={[styles.sectionTitle, { color: colors }]}>
        {title}
      </ThemedText>
    </View>
  );
};

export default function ContactSupportScreen() {
  const backgroundColor = useThemeColor({}, "background");
  const { alertVisible, alertOptions, showAlert, hideAlert } = useBottomSheet();

  const handleWhatsAppPress = () => {
    showAlert({
      title: "Coming Soon",
      message: "WhatsApp support will be available soon. Stay tuned!",
    });
  };

  const handleXPress = async () => {
    try {
      await openBrowserAsync("https://x.com/BellsBuyNigeria");
    } catch (error) {
      console.error("Error opening X/Twitter:", error);
    }
  };

  const handleInstagramPress = async () => {
    try {
      await openBrowserAsync("https://www.instagram.com/bellsbuynigeria/");
    } catch (error) {
      console.error("Error opening Instagram:", error);
    }
  };

  const handleEmailPress = async () => {
    try {
      const emailUrl = `mailto:bellsbuy1@gmail.com?subject=Support Request&body=Hi, I need help with...`;
      await Linking.openURL(emailUrl);
    } catch (error) {
      console.error("Error opening email:", error);
    }
  };

  const handleFAQPress = () => {
    // TODO: Implement FAQ functionality
    console.log("FAQ pressed");
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <Header title="Contact support" showBackButton />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Channels Section */}
        <SectionHeader title="Channels" />

        <View style={styles.sectionContainer}>
          <ContactOption
            icon="logo-whatsapp"
            title="WhatsApp"
            onPress={handleWhatsAppPress}
          />
          <ContactOption
            icon="logo-twitter"
            title="X (Formerly Twitter)"
            onPress={handleXPress}
          />
          <ContactOption
            icon="logo-instagram"
            title="Instagram"
            onPress={handleInstagramPress}
          />
        </View>

        {/* Other Section */}
        <SectionHeader title="Other" />

        <View style={styles.sectionContainer}>
          <ContactOption
            icon="mail-outline"
            title="Send us an email"
            subtitle="Replies within 8hrs"
            onPress={handleEmailPress}
          />
          <ContactOption
            icon="help-circle-outline"
            title="FAQ"
            subtitle="Get answers to common questions"
            onPress={handleFAQPress}
          />
        </View>
      </ScrollView>

      {/* Alert Bottom Sheet for Coming Soon messages */}
      <AlertBottomSheet
        visible={alertVisible}
        onClose={hideAlert}
        title={alertOptions?.title || ""}
        message={alertOptions?.message || ""}
        buttonText="OK"
        onPress={hideAlert}
        variant="default"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionContainer: {
    backgroundColor: "transparent",
  },
  contactOption: {
    borderBottomWidth: 1,
    marginHorizontal: Spacing.lg,
  },
  contactOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
});
