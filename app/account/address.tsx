import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Campus locations list
const CAMPUS_LOCATIONS = [
  "Marquee",
  "Classroom B3",
  "Hall D",
  "Classroom B6",
  "Male Silver 2",
  "Student Friendship Center",
  "Male Bronze 2 Annex",
  "Adenuga Building (ADG)",
  "Male Silver 3",
  "Classroom B7",
  "Temperance Gate",
  "Classroom B9",
  "New Female Hostel (Chapel Road)",
  "Glass House",
  "Classroom 6 (Uptown)",
  "Male Bronze 2",
  "Classroom 5 (Uptown)",
  "New Horizons",
  "Consult Office Area",
  "Wema Bank",
  "Female Emerald 1",
  "Classroom 1 (Uptown)",
  "BUPF HALL",
  "Classroom 3 (Uptown)",
  "Physics Lab",
  "Male Bronze 1",
  "Clinic",
  "Female Silver",
  "Old Gate",
  "Female Emerald 2",
  "Hall B",
  "Classroom B8",
  "New Gate",
  "Biology Lab",
  "New Male Hostel (Chapel Road)",
  "Classroom 2 (Uptown)",
  "Classroom B1",
  "Classroom 4 (Uptown)",
  "Chemistry Lab",
  "Male Silver 1",
  "ELT",
];

export default function AddressScreen() {
  const { user, isLoading } = useAuth();
  const [address, setAddress] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // All hooks must be called before any conditional returns
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const borderColor = useThemeColor(
    { light: "#EEE", dark: "#23262F" },
    "background"
  );
  const inputBgColor = useThemeColor(
    { light: "#F7F7F7", dark: "#23262F" },
    "background"
  );

  // Fetch user's current address from Supabase
  useEffect(() => {
    const fetchAddress = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("hostel")
          .eq("id", user.id)
          .single();

        if (error) {
          logger.error("Error fetching address", error, {
            component: "AddressScreen",
          });
          // Set default address if none exists
          setAddress("Male Bronze 2 Annex");
        } else {
          setAddress(data?.hostel || "Male Bronze 2 Annex");
        }
      } catch (error) {
        logger.error("Error fetching address", error, {
          component: "AddressScreen",
        });
        setAddress("Male Bronze 2 Annex");
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [user]);

  // Show loading screen while checking auth or loading address
  if (isLoading || isLoadingAddress) {
    return (
      <View
        style={[styles.container, { backgroundColor: headerBackgroundColor }]}
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header shown during loading to keep layout consistent */}
        <View
          style={[
            styles.customHeader,
            {
              paddingTop: insets.top,
              height: 56 + insets.top,
              backgroundColor: headerBackgroundColor,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={26} color="#0A84FF" />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: textColor }]}>
            Delivery Address
          </ThemedText>
        </View>

        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <LoadingScreen />
        </View>
      </View>
    );
  }

  // Return null if not authenticated (redirect will be triggered by useAuth)
  if (!user) {
    return null;
  }

  const handleSave = async () => {
    if (!user || !address.trim()) {
      Alert.alert("Error", "Please select a valid address");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          hostel: address.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (error) {
        logger.error("Error saving address", error, {
          component: "AddressScreen",
        });
        Alert.alert("Error", "Failed to save address. Please try again.");
      } else {
        Alert.alert("✅ Success", "Address updated successfully!");
      }
    } catch (error) {
      logger.error("Error saving address", error, {
        component: "AddressScreen",
      });
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLocations = CAMPUS_LOCATIONS.filter((location) =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLocationItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.locationItem,
        {
          backgroundColor: cardBg,
        },
      ]}
      onPress={() => {
        setAddress(item);
        setShowLocationPicker(false);
        setSearchQuery("");
      }}
    >
      <ThemedText style={[styles.locationText, { color: textColor }]}>
        {item}
      </ThemedText>
      {address === item && (
        <Ionicons name="checkmark" size={24} color={accent} />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: headerBackgroundColor }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header - fixed to top */}
      <View
        style={[
          styles.customHeader,
          {
            paddingTop: insets.top,
            height: 56 + insets.top,
            backgroundColor: headerBackgroundColor,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={26} color="#0A84FF" />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Delivery Address
        </ThemedText>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Current Address
            </ThemedText>
            <ThemedText style={[styles.currentAddress, { color: textColor }]}>
              {address}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              Update Address
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.locationSelector,
                {
                  borderColor: borderColor,
                  backgroundColor: inputBgColor,
                },
              ]}
              onPress={() => setShowLocationPicker(true)}
            >
              <ThemedText
                style={[styles.locationSelectorText, { color: textColor }]}
              >
                {address}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: isSaving ? "#ccc" : accent,
                  opacity: isSaving ? 0.7 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <ThemedText style={styles.saveBtnText}>
                {isSaving ? "Saving..." : "Save Address"}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#888"
            />
            <ThemedText style={styles.infoText}>
              Select your delivery location from the campus options below.
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: cardBg }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              height: 56,
              backgroundColor: headerBackgroundColor,
              borderBottomWidth: 1,
              borderBottomColor: borderColor,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowLocationPicker(false);
                setSearchQuery("");
              }}
            >
              <ThemedText style={[styles.modalButton, { color: accent }]}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { color: textColor }]}>
              Select Location
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                setShowLocationPicker(false);
                setSearchQuery("");
              }}
            >
              <ThemedText style={[styles.modalButton, { color: accent }]}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchWrapper}>
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: inputBgColor },
              ]}
            >
              <Ionicons name="search" size={20} color="#888" />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search locations..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Locations List */}
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: undefined, // ThemedView will handle background
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  card: {
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 32,
  },
  label: {
    color: "#8E8E93",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: "#F7F7F7",
  },
  saveBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  currentAddress: {
    fontSize: 16,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginBottom: 24,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 24,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    padding: 16,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#888",
    flex: 1,
    lineHeight: 20,
  },
  locationSelector: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationSelectorText: {
    flex: 1,
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  locationText: {
    fontSize: 18,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    paddingLeft: 12,
    fontSize: 16,
  },
  modalButton: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  listContainer: {
    paddingBottom: 20, // Add some padding at the bottom for the modal
  },
});
