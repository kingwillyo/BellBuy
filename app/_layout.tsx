import { Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
// import { CardStyleInterpolators } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { WishlistProvider } from "@/hooks/useWishlistProducts";
import Toast, {
  BaseToast,
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";
import { OfflineBanner } from "../components/OfflineBanner";
import { CartProvider } from "../context/CartContext";
import { OfflineProvider, useOffline } from "../context/OfflineContext";

function AppContent() {
  const { isOffline, executeRetryQueue } = useOffline();

  const handleRetry = async () => {
    await executeRetryQueue();
  };

  return (
    <>
      <OfflineBanner isVisible={isOffline} onRetry={handleRetry} />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

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
    push: (props: ToastConfigParams<any>) => (
      <BaseToast
        {...props}
        onPress={() => {
          Toast.hide();
          if (props.props && typeof props.props.onPress === "function") {
            props.props.onPress();
          }
        }}
        style={{
          backgroundColor: "rgba(10, 132, 255, 0.85)",
          borderLeftColor: "#0A84FF",
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{ color: "#fff", fontWeight: "bold" }}
        text2Style={{ color: "#fff" }}
      />
    ),
  };

  // Show in-app toast for every push notification
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const content = notification.request.content || ({} as any);
        const title = content.title || "Notification";
        const body = content.body || "";
        const data: any = content.data || {};

        const onPress = () => {
          // Navigate based on payload
          // Message/chat → open specific conversation with other user
          if (
            (data?.type === "message" || data?.type === "chat") &&
            data.conversationId
          ) {
            router.push({
              pathname: "/chat/ChatScreen",
              params: {
                conversationId: String(data.conversationId),
                // Prefer other party id (senderId for incoming messages), fall back to provided receiver_id
                receiver_id: data.senderId || data.receiver_id,
              },
            });
            return;
          }
          // Order notification (your product got ordered) → Seller Orders list
          if (data?.type === "order") {
            router.push("/account/seller-orders");
            return;
          }
          // Order status update for buyer → go to specific order
          if (data?.type === "order_status" && data.orderId) {
            router.push({
              pathname: "/orders/[id]",
              params: { id: String(data.orderId) },
            });
            return;
          }
          if (data?.type === "product" && data.productId) {
            router.push({
              pathname: "/(product)/[id]",
              params: { id: String(data.productId) },
            });
            return;
          }
          if (data?.type === "super_flash_sale") {
            router.push("/super-flash-sale");
            return;
          }
          // Follow notification → go to seller profile
          if (data?.type === "follow" && data.followingId) {
            router.push({
              pathname: "/seller/[id]",
              params: { id: String(data.followingId) },
            });
            return;
          }
          // Fallback
          router.push("/(tabs)/account");
        };

        Toast.show({
          type: "push",
          text1: title,
          text2: body,
          visibilityTime: 8000,
          position: "top",
          topOffset: 60,
          props: { onPress },
        });
      }
    );

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const content = response.notification.request.content || ({} as any);
        const data: any = content.data || {};

        // Message/chat → open conversation with other user
        if (
          (data?.type === "message" || data?.type === "chat") &&
          data.conversationId
        ) {
          router.push({
            pathname: "/chat/ChatScreen",
            params: {
              conversationId: String(data.conversationId),
              receiver_id: data.senderId || data.receiver_id,
            },
          });
          return;
        }
        // Order notification (your product got ordered) → Seller Orders list
        if (data?.type === "order") {
          router.push("/account/seller-orders");
          return;
        }
        // Order status update for buyer → go to specific order
        if (data?.type === "order_status" && data.orderId) {
          router.push({
            pathname: "/orders/[id]",
            params: { id: String(data.orderId) },
          });
          return;
        }
        if (data?.type === "product" && data.productId) {
          router.push({
            pathname: "/(product)/[id]",
            params: { id: String(data.productId) },
          });
          return;
        }
        if (data?.type === "super_flash_sale") {
          router.push("/super-flash-sale");
          return;
        }
        // Follow notification → go to seller profile
        if (data?.type === "follow" && data.followingId) {
          router.push({
            pathname: "/seller/[id]",
            params: { id: String(data.followingId) },
          });
          return;
        }
        router.push("/(tabs)/account");
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <OfflineProvider>
        <WishlistProvider>
          <CartProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <AppContent />
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="chat/ChatListScreen"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="chat/ChatScreen"
                  options={{ headerShown: false }}
                />
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
              <StatusBar
                style={colorScheme === "dark" ? "light" : "dark"}
                backgroundColor={
                  Platform.OS === "android"
                    ? colorScheme === "light"
                      ? "#ffffff"
                      : "#000000"
                    : undefined
                }
                translucent={false}
              />
              <Toast config={toastConfig} />
            </ThemeProvider>
          </CartProvider>
        </WishlistProvider>
      </OfflineProvider>
    </SafeAreaProvider>
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
