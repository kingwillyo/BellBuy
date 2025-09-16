import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useFollowCounts, useFollowStatus } from "@/hooks/useFollow";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");
const localDefaultAvatar = require("../../assets/images/icon.png");

interface SellerProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  username?: string;
  bio?: string;
  phone?: string;
  level?: string;
  department?: string;
  created_at: string;
  university_id?: string;
  universities?: {
    id: string;
    name: string;
  };
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  main_image?: string;
  image_urls?: string[];
  discount?: number;
}

export default function SellerProfilePage() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nativeColorScheme = useNativeColorScheme();
  const isDarkMode = nativeColorScheme === "dark";

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const cardBackgroundColor = useThemeColor(
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
  const headerBackgroundColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background"
  );

  // Follow functionality
  const {
    isFollowing,
    loading: followLoading,
    toggle: toggleFollow,
    canQuery: canFollowQuery,
  } = useFollowStatus(seller?.id);

  const {
    followers,
    following,
    loading: countsLoading,
  } = useFollowCounts(seller?.id);

  useEffect(() => {
    if (!id) return;
    fetchSellerProfile();
  }, [id]);

  const fetchSellerProfile = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          universities (
            id,
            name
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError("Seller not found");
        return;
      }

      setSeller(data);
      await fetchSellerProducts(data.id);
    } catch (err: any) {
      setError(err.message || "Failed to load seller profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerProducts = async (sellerId: string) => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, main_image, image_urls")
        .eq("user_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const productsWithDiscount = (data || []).map((product) => ({
        ...product,
        discount: 0,
      }));

      setProducts(productsWithDiscount);
    } catch (err: any) {
      console.error("Error fetching products:", err);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleChat = async () => {
    if (!user || !seller) return;

    if (user.id === seller.id) {
      // Can't chat with yourself
      return;
    }

    try {
      // Find existing conversation between user and seller by checking messages
      let conversationId = null;
      const { data: existingMessages, error: convoError } = await supabase
        .from("messages")
        .select("conversation_id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${seller.id}),and(sender_id.eq.${seller.id},receiver_id.eq.${user.id})`
        )
        .limit(1);

      if (convoError) {
        console.error("Error checking conversations:", convoError);
        return;
      }

      if (existingMessages && existingMessages.length > 0) {
        conversationId = existingMessages[0].conversation_id;
      } else {
        // Create new conversation
        const { data: newConvo, error: newConvoError } = await supabase
          .from("conversations")
          .insert({})
          .select()
          .maybeSingle();

        if (newConvoError || !newConvo) {
          console.error("Error creating conversation:", newConvoError);
          return;
        }

        conversationId = newConvo.id;
      }

      if (conversationId) {
        router.push({
          pathname: "/chat/ChatScreen",
          params: { conversationId, receiver_id: seller.id },
        });
      }
    } catch (err: any) {
      console.error("Error starting chat:", err);
    }
  };

  const handleFollow = async () => {
    if (!canFollowQuery) return;
    await toggleFollow();
  };

  const renderProduct = ({ item }: { item: SellerProduct }) => (
    <View style={styles.productItem}>
      <ProductCard
        product={{
          id: item.id,
          name: item.name,
          price: item.price,
          image:
            item.main_image || (item.image_urls && item.image_urls[0]) || "",
          discount: item.discount,
        }}
        style={{ margin: 0 }}
      />
    </View>
  );

  if (loading) {
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
              Seller Info
            </ThemedText>
            <View style={{ width: 26 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <ThemedText style={[styles.loadingText, { color: textColor }]}>
              Loading seller profile...
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error || !seller) {
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
              Error
            </ThemedText>
            <View style={{ width: 26 }} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={accent} />
            <ThemedText style={[styles.errorText, { color: textColor }]}>
              {error || "Seller not found"}
            </ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: accent }]}
              onPress={fetchSellerProfile}
            >
              <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const username =
    seller.username || (seller.email ? `@${seller.email.split("@")[0]}` : "");

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

        {/* Header */}
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
            Seller Info
          </ThemedText>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          data={[1]} // Dummy data to render the profile section
          keyExtractor={() => "profile"}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <ExpoImage
                    source={
                      seller.avatar_url ? seller.avatar_url : localDefaultAvatar
                    }
                    style={styles.avatar}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.profileInfo}>
                    <ThemedText
                      style={[styles.sellerName, { color: textColor }]}
                    >
                      {seller.full_name || "Unknown Seller"}
                    </ThemedText>
                    <ThemedText style={[styles.username, { color: accent }]}>
                      {username}
                    </ThemedText>
                    {seller.bio && (
                      <ThemedText style={[styles.bio, { color: textColor }]}>
                        {seller.bio}
                      </ThemedText>
                    )}
                    {seller.universities && (
                      <View style={styles.universityContainer}>
                        <Ionicons
                          name="school-outline"
                          size={16}
                          color={accent}
                          style={styles.universityIcon}
                        />
                        <ThemedText
                          style={[styles.universityText, { color: accent }]}
                        >
                          {seller.universities.name}
                        </ThemedText>
                      </View>
                    )}
                    {(seller.level || seller.department) && (
                      <View style={styles.academicInfoContainer}>
                        {seller.level && (
                          <View style={styles.academicInfoItem}>
                            <Ionicons
                              name="school-outline"
                              size={14}
                              color={textColor}
                              style={styles.academicInfoIcon}
                            />
                            <ThemedText
                              style={[
                                styles.academicInfoText,
                                { color: textColor },
                              ]}
                            >
                              Level {seller.level}
                            </ThemedText>
                          </View>
                        )}
                        {seller.department && (
                          <View style={styles.academicInfoItem}>
                            <Ionicons
                              name="library-outline"
                              size={14}
                              color={textColor}
                              style={styles.academicInfoIcon}
                            />
                            <ThemedText
                              style={[
                                styles.academicInfoText,
                                { color: textColor },
                              ]}
                            >
                              {seller.department}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <ThemedText
                      style={[styles.statNumber, { color: textColor }]}
                    >
                      {products.length}
                    </ThemedText>
                    <ThemedText
                      style={[styles.statLabel, { color: textColor }]}
                    >
                      Listings
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() =>
                      router.push(`/account/followers?userId=${seller.id}`)
                    }
                  >
                    <ThemedText
                      style={[styles.statNumber, { color: textColor }]}
                    >
                      {followers}
                    </ThemedText>
                    <ThemedText
                      style={[styles.statLabel, { color: textColor }]}
                    >
                      Followers
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() =>
                      router.push(`/account/following?userId=${seller.id}`)
                    }
                  >
                    <ThemedText
                      style={[styles.statNumber, { color: textColor }]}
                    >
                      {following}
                    </ThemedText>
                    <ThemedText
                      style={[styles.statLabel, { color: textColor }]}
                    >
                      Following
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      {
                        backgroundColor: isFollowing ? dividerColor : accent,
                      },
                    ]}
                    onPress={handleFollow}
                    disabled={followLoading || !canFollowQuery}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <ThemedText
                        style={[
                          styles.followButtonText,
                          { color: isFollowing ? textColor : "#fff" },
                        ]}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </ThemedText>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chatButton, { backgroundColor: accent }]}
                    onPress={handleChat}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color="#fff"
                    />
                    <ThemedText style={styles.chatButtonText}>Chat</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Products Section Header */}
              <View style={styles.productsHeader}>
                <ThemedText
                  style={[styles.productsTitle, { color: textColor }]}
                >
                  Listings ({products.length})
                </ThemedText>
              </View>
            </View>
          }
          renderItem={() => null}
          ListFooterComponent={
            <View style={styles.productsContainer}>
              {productsLoading ? (
                <View style={styles.productsLoadingContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <ThemedText
                    style={[styles.loadingText, { color: textColor }]}
                  >
                    Loading products...
                  </ThemedText>
                </View>
              ) : products.length > 0 ? (
                <FlatList
                  data={products}
                  renderItem={renderProduct}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.productRow}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyProductsContainer}>
                  <Ionicons name="grid-outline" size={48} color={accent} />
                  <ThemedText
                    style={[styles.emptyProductsText, { color: textColor }]}
                  >
                    No products yet
                  </ThemedText>
                  <ThemedText
                    style={[styles.emptyProductsSubtext, { color: textColor }]}
                  >
                    This seller hasn't listed any products yet.
                  </ThemedText>
                </View>
              )}
            </View>
          }
        />
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
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#f0f0f0",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  sellerName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  universityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  universityIcon: {
    marginRight: 6,
  },
  universityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  academicInfoContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 12,
  },
  academicInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  academicInfoIcon: {
    marginRight: 4,
  },
  academicInfoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  followButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  productsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  productsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productsLoadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  productRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productItem: {
    width: (screenWidth - 48) / 2,
  },
  emptyProductsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyProductsText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyProductsSubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
