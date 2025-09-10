/* eslint-disable @typescript-eslint/no-unused-vars */
import { CategoryRow } from "@/components/CategoryRow";
import { ProductCard } from "@/components/ProductCard";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
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

export default function SearchScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const background = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");
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
    "icon"
  );
  const searchTextColor = useThemeColor(
    { light: "#666", dark: "#fff" },
    "text"
  );
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#404040" },
    "icon"
  );
  const suggestionsBackground = useThemeColor({}, "background");
  const suggestionTextColor = useThemeColor(
    { light: "#000", dark: "#FFF" },
    "text"
  );
  const suggestionBorderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "icon"
  );
  const suggestionDividerColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333" },
    "icon"
  );

  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

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
    supabase
      .from("products")
      .select("*")
      .then(({ data, error }) => {
        if (!error && data) setProducts(data);
      });
  }, []);

  const handleSearchSubmit = () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSearchSubmitted(true);
    // You can add additional search logic here if needed
    // For example, analytics tracking, search history, etc.
  };

  // Suggestions: top 7 matches by name/category
  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleSuggestionPress = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    setSearchSubmitted(true);
    Keyboard.dismiss();
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

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            { borderBottomColor: borderColor, paddingTop: 8 },
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
                  <Text
                    style={[
                      styles.suggestionText,
                      { color: suggestionTextColor },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {searchQuery && searchSubmitted ? (
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
                        { backgroundColor: "#0A84FF", shadowColor: "#0A84FF" },
                      ]}
                    >
                      <Ionicons name="close" size={42} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.notFoundTitle}>That item isn't listed yet</Text>
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
                    <Text style={styles.notFoundButtonText}>Return to Marketplace</Text>
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
  },
  suggestionText: {
    fontSize: 16,
    color: "#8F9BB3",
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
