/* eslint-disable @typescript-eslint/no-unused-vars */
import { CategoryRow } from "@/components/CategoryRow";
import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useUserUniversity } from "@/hooks/useUserUniversity";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Keyboard,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- Dummy Product Data ---
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  main_image?: string;
  image_urls?: string[];
}

interface SuggestionItem {
  id: string;
  name: string;
  isHistory?: boolean;
  isCategory?: boolean;
  category?: string;
  description?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
  const textColor = text; // Alias for consistency
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const backgroundColor = isDarkMode
    ? Colors.dark.background
    : Colors.light.background;

  // Match the home page search bar theming
  const searchBackgroundColor = useThemeColor(
    { light: "#F5F5F5", dark: "#2A2A2A" },
    "background"
  );
  const searchIconColor = useThemeColor(
    { light: "#666", dark: "#fff" },
    "text"
  );
  const searchTextColor = useThemeColor(
    { light: "#666", dark: "#fff" },
    "text"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#404040" },
    "text"
  );
  const suggestionsBackground = useThemeColor({}, "background");
  const suggestionTextColor = useThemeColor(
    { light: "#000", dark: "#FFF" },
    "text"
  );
  const suggestionBorderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "text"
  );
  const suggestionDividerColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "text"
  );
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "tint");

  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { universityId } = useUserUniversity();

  // Auto-focus the search input every time the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      return () => {
        clearTimeout(focusTimer);
      };
    }, [])
  );

  useEffect(() => {
    const query = universityId
      ? supabase.from("products").select("*").eq("university_id", universityId)
      : supabase.from("products").select("*");

    query.then(({ data, error }) => {
      if (!error && data) setProducts(data);
    });
  }, [universityId]);

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSearchSubmitted(true);

    // Add to search history if query is not empty
    if (searchQuery.trim()) {
      setSearchHistory((prev) => {
        const newHistory = [
          searchQuery.trim(),
          ...prev.filter((item) => item !== searchQuery.trim()),
        ];
        return newHistory.slice(0, 10); // Keep only last 10 searches
      });
    }
  };

  // Enhanced search function that searches multiple fields
  const searchInProduct = (product: any, query: string): boolean => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return false;

    // Search in multiple fields
    const searchableFields = [
      product.name || "",
      product.category || "",
      product.description || "",
      product.brand || "",
      product.condition || "",
      product.color || "",
      product.size || "",
      product.material || "",
    ];

    // Check if any field contains the search term
    return searchableFields.some((field) =>
      field.toLowerCase().includes(searchTerm)
    );
  };

  // Popular categories for when there's no search history
  const popularCategories = [
    "Electronics",
    "Clothing",
    "Books",
    "Furniture",
    "Sports",
    "Beauty",
    "Home & Garden",
  ];

  // Suggestions: top 7 matches with enhanced search or recent searches
  const suggestions = useMemo((): SuggestionItem[] => {
    if (!searchQuery) {
      // Show recent searches when no query, or popular categories if no history
      if (searchHistory.length > 0) {
        return searchHistory.slice(0, 5).map((term) => ({
          id: `history-${term}`,
          name: term,
          isHistory: true,
        }));
      } else {
        return popularCategories.slice(0, 5).map((category) => ({
          id: `category-${category}`,
          name: category,
          isCategory: true,
        }));
      }
    }

    const matches = products.filter((product) =>
      searchInProduct(product, searchQuery)
    );

    // Sort by relevance (exact matches first, then partial matches)
    return matches
      .sort((a, b) => {
        const aNameMatch = a.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
        const bNameMatch = b.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
        const aCategoryMatch = a.category
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
        const bCategoryMatch = b.category
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

        // Prioritize name matches, then category matches
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        if (aCategoryMatch && !bCategoryMatch) return -1;
        if (!aCategoryMatch && bCategoryMatch) return 1;

        return 0;
      })
      .slice(0, 7);
  }, [products, searchQuery, searchHistory]);

  const handleSuggestionPress = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    setSearchSubmitted(true);
    Keyboard.dismiss();
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  // Show suggestions when typing
  useEffect(() => {
    if (searchQuery.length > 0 && !searchSubmitted) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, searchSubmitted]);

  // Reset searchSubmitted when query changes
  useEffect(() => {
    if (searchSubmitted && searchQuery.length === 0) {
      setSearchSubmitted(false);
    }
  }, [searchQuery, searchSubmitted]);

  // Enhanced filtered products using the same search logic
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter((product) => searchInProduct(product, searchQuery));
  }, [products, searchQuery]);

  const screenWidth = Dimensions.get("window").width;
  const fallbackImage = "https://via.placeholder.com/160x160?text=No+Image";

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: backgroundColor }]}
      >
        <View
          style={[
            styles.headerContainer,
            {
              borderBottomColor: borderColor,
              paddingTop: Platform.OS === "android" ? insets.top + 8 : 8,
            },
          ]}
        >
          <View
            style={[
              styles.searchBar,
              { backgroundColor: searchBackgroundColor },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={searchIconColor}
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              placeholder="Search for products"
              placeholderTextColor={searchTextColor}
              style={[styles.searchInput, { color: text }]}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setSearchSubmitted(false);
              }}
              returnKeyType="search"
              blurOnSubmit={true}
              onSubmitEditing={handleSearchSubmit}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchButton}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={searchIconColor}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Suggestions List - now outside headerContainer, fills screen */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={{ flex: 1 }}>
            {/* Recent searches header */}
            {!searchQuery && (
              <View style={styles.recentSearchesHeader}>
                <ThemedText
                  style={[styles.recentSearchesTitle, { color: textColor }]}
                >
                  {searchHistory.length > 0
                    ? "Recent Searches"
                    : "Popular Categories"}
                </ThemedText>
                {searchHistory.length > 0 && (
                  <TouchableOpacity onPress={clearSearchHistory}>
                    <ThemedText
                      style={[styles.clearHistoryButton, { color: accent }]}
                    >
                      Clear
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionItem}
                  activeOpacity={0.6}
                  onPress={() => {
                    handleSuggestionPress(item.name);
                    Keyboard.dismiss();
                  }}
                >
                  <View style={styles.suggestionContent}>
                    <View style={styles.suggestionHeader}>
                      <Text
                        style={[
                          styles.suggestionText,
                          { color: suggestionTextColor },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.isHistory && (
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={suggestionTextColor}
                          style={{ opacity: 0.5 }}
                        />
                      )}
                      {item.isCategory && (
                        <Ionicons
                          name="grid-outline"
                          size={16}
                          color={suggestionTextColor}
                          style={{ opacity: 0.5 }}
                        />
                      )}
                    </View>
                    {!item.isHistory && item.category && (
                      <Text
                        style={[
                          styles.suggestionCategory,
                          { color: suggestionTextColor, opacity: 0.7 },
                        ]}
                      >
                        in {item.category}
                      </Text>
                    )}
                    {!item.isHistory && item.description && (
                      <Text
                        style={[
                          styles.suggestionDescription,
                          { color: suggestionTextColor, opacity: 0.6 },
                        ]}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {searchQuery && searchSubmitted ? (
          <View style={{ flex: 1 }}>
            {/* Search Results Header */}
            <View style={styles.searchResultsHeader}>
              <ThemedText
                style={[styles.searchResultsCount, { color: textColor }]}
              >
                {filteredProducts.length} result
                {filteredProducts.length !== 1 ? "s" : ""} for "{searchQuery}"
              </ThemedText>
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ width: "48%", marginBottom: 12 }}>
                  <ProductCard
                    key={item.id}
                    product={{
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      image:
                        (item.main_image &&
                          typeof item.main_image === "string" &&
                          item.main_image) ||
                        (item.image_urls && item.image_urls[0]) ||
                        fallbackImage,
                    }}
                  />
                </View>
              )}
              numColumns={2}
              columnWrapperStyle={{
                justifyContent: "flex-start",
                flexDirection: "row",
                gap: 12,
                marginBottom: 12,
              }}
              showsVerticalScrollIndicator={true}
              style={{ flex: 1 }}
              onScrollBeginDrag={Keyboard.dismiss}
              onMomentumScrollBegin={Keyboard.dismiss}
              ListEmptyComponent={
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View style={styles.notFoundContainer}>
                    <View style={styles.notFoundIconWrapper}>
                      <View
                        style={[
                          styles.notFoundCircle,
                          {
                            backgroundColor: "#0A84FF",
                            shadowColor: "#0A84FF",
                          },
                        ]}
                      >
                        <Ionicons name="close" size={42} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.notFoundTitle}>
                      That item isn't listed yet
                    </Text>
                    <Text style={styles.notFoundSubtext}>
                      thank you for shopping
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.notFoundButton,
                        { backgroundColor: "#0A84FF", shadowColor: "#0A84FF" },
                      ]}
                      onPress={() => router.replace("/")}
                    >
                      <Text style={styles.notFoundButtonText}>
                        Return to Marketplace
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              }
              contentContainerStyle={
                filteredProducts.length === 0
                  ? styles.listEmptyContainer
                  : [
                      styles.productListContainer,
                      { paddingHorizontal: Math.round(screenWidth * 0.04) },
                    ]
              }
            />
          </View>
        ) : (
          // Only show categories if not showing suggestions
          !showSuggestions && (
            <ScrollView
              style={[
                styles.scrollViewContent,
                { backgroundColor: background },
              ]}
              showsVerticalScrollIndicator={true}
              onScrollBeginDrag={Keyboard.dismiss}
              onMomentumScrollBegin={Keyboard.dismiss}
            >
              <CategoryRow />
            </ScrollView>
          )
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearSearchButton: {
    padding: 4,
  },
  scrollViewContent: {
    flex: 1,
  },
  row: {
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  productListContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  listEmptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  noResultsContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubText: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  suggestionsContainer: {
    // No dropdown styling, just a normal list
  },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  suggestionText: {
    fontSize: 16,
    color: "#8F9BB3",
    fontWeight: "500",
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 14,
    fontWeight: "400",
    marginBottom: 2,
  },
  suggestionDescription: {
    fontSize: 13,
    fontWeight: "400",
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  searchResultsCount: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
  },
  recentSearchesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  recentSearchesTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  clearHistoryButton: {
    fontSize: 14,
    fontWeight: "500",
  },
  notFoundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 64,
    backgroundColor: "transparent",
  },
  notFoundIconWrapper: {
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundCircle: {
    width: 72,
    height: 72,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  notFoundTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  notFoundSubtext: {
    fontSize: 15,
    color: "#A3A3A3",
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "400",
  },
  notFoundButton: {
    width: 343,
    alignSelf: "center",
    backgroundColor: "#0A84FF",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0A84FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  notFoundButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});
