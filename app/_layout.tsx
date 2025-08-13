import { Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
// import { CardStyleInterpolators } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import { Stack, Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {} from "react-native";
import "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { WishlistProvider } from "@/hooks/useWishlistProducts";
import Toast, {
  BaseToast,
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";
import { CartProvider } from "../context/CartContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const toastConfig: ToastConfig = {
    success: (props: ToastConfigParams<any>) => (
      <BaseToast
        {...props}
        onPress={() => {
          Toast.hide();
          router.push("/(tabs)/cart");
        }}
        style={{
          backgroundColor: "rgba(10, 132, 255, 0.85)", // #0A84FF with 85% opacity
          borderLeftColor: "#0A84FF",
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{ color: "#fff", fontWeight: "bold" }}
        text2Style={{ color: "#fff" }}
      />
    ),
  };

  return (
    <WishlistProvider>
      <CartProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth/signin"
              options={{ headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen
              name="auth/signup"
              options={{ headerShown: false, gestureEnabled: true }}
            />
            <Stack.Screen name="+not-found" />
            <Stack.Screen
              name="checkout"
              options={{
                headerShown: false,
                gestureEnabled: true,
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="success"
              options={{
                headerShown: false,
                gestureEnabled: false,
                headerBackVisible: false,
              }}
            />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <Toast config={toastConfig} />
        </ThemeProvider>
      </CartProvider>
    </WishlistProvider>
  );
}

export function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          paddingBottom: insets.bottom || 4,
          paddingTop: 2,
        },
        tabBarActiveTintColor: "#0A84FF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarShowLabel: true, // Ensure labels are shown
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "500",
          marginTop: 0,
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name="home-outline"
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name="search-outline"
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name="add-circle-outline"
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Cart",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name="cart-outline"
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name="person-outline"
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
