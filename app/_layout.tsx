import { Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { CardStyleInterpolators } from "@react-navigation/stack";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";
import { WishlistProvider } from "@/hooks/useWishlistProducts";
import { View } from "react-native";
import Toast, {
  BaseToast,
  ToastConfig,
  ToastConfigParams,
} from "react-native-toast-message";
import { ErrorBoundary } from "../components/ErrorBoundary";
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
    success: (props: ToastConfigParams<any>) => {
      const colorScheme = useColorScheme();
      const isDarkMode = colorScheme === "dark";

      return (
        <BaseToast
          {...props}
          onPress={() => {
            Toast.hide();
            router.push("/(tabs)/cart");
          }}
          style={{
            backgroundColor: isDarkMode ? "#2C2C2E" : "#F8F9FA",
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: "#0A84FF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.1 : 0.05,
            shadowRadius: 4,
            elevation: 2,
            marginHorizontal: 20,
            minHeight: 48,
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          text1Style={{
            color: isDarkMode ? "#FFFFFF" : "#1A1A1A",
            fontWeight: "500",
            fontSize: 15,
            marginBottom: 0,
            flex: 1,
          }}
          text2Style={{
            color: isDarkMode ? "#CCCCCC" : "#666666",
            fontSize: 13,
            fontWeight: "400",
            marginTop: 2,
          }}
          renderTrailingIcon={() => (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#0A84FF",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        />
      );
    },
    wishlist: (props: ToastConfigParams<any>) => {
      const colorScheme = useColorScheme();
      const isDarkMode = colorScheme === "dark";

      return (
        <BaseToast
          {...props}
          style={{
            backgroundColor: isDarkMode ? "#2C2C2E" : "#F8F9FA",
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: "#0A84FF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.1 : 0.05,
            shadowRadius: 4,
            elevation: 2,
            marginHorizontal: 20,
            minHeight: 48,
          }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          text1Style={{
            color: isDarkMode ? "#FFFFFF" : "#1A1A1A",
            fontWeight: "500",
            fontSize: 15,
            marginBottom: 0,
            flex: 1,
          }}
          text2Style={{
            color: isDarkMode ? "#CCCCCC" : "#666666",
            fontSize: 13,
            fontWeight: "400",
            marginTop: 2,
          }}
          renderTrailingIcon={() => (
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#0A84FF",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        />
      );
    },
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

  // Show in-app toast for every push notification (except messages)
  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const content = notification.request.content || ({} as any);
        const title = content.title || "Notification";
        const body = content.body || "";
        const data: any = content.data || {};

        // Skip showing in-app toast for message notifications
        if (data?.type === "message" || data?.type === "chat") {
          return;
        }

        const onPress = () => {
          // Navigate based on payload
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <OfflineProvider>
            <WishlistProvider>
              <CartProvider>
                <ThemeProvider
                  value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                >
                  <AppContent />
                  <Stack
                    screenOptions={{
                      animation: "slide_from_right",
                      animationDuration: 200,
                      gestureEnabled: true,
                      gestureDirection: "horizontal",
                      // Force slide animation on Android
                      cardStyleInterpolator:
                        CardStyleInterpolators.forHorizontalIOS,
                      transitionSpec: {
                        open: {
                          animation: "timing",
                          config: {
                            duration: 200,
                          },
                        },
                        close: {
                          animation: "timing",
                          config: {
                            duration: 200,
                          },
                        },
                      },
                    }}
                  >
                    <Stack.Screen
                      name="(tabs)"
                      options={{
                        headerShown: false,
                        animation: "fade",
                      }}
                    />
                    <Stack.Screen
                      name="chat/ChatListScreen"
                      options={{
                        headerShown: false,
                        animation: "slide_from_right",
                        cardStyleInterpolator:
                          CardStyleInterpolators.forHorizontalIOS,
                      }}
                    />
                    <Stack.Screen
                      name="chat/ChatScreen"
                      options={{
                        headerShown: false,
                        animation: "slide_from_right",
                        cardStyleInterpolator:
                          CardStyleInterpolators.forHorizontalIOS,
                      }}
                    />
                    <Stack.Screen
                      name="auth/signin"
                      options={{
                        headerShown: false,
                        gestureEnabled: true,
                        animation: "fade",
                      }}
                    />
                    <Stack.Screen
                      name="auth/signup"
                      options={{
                        headerShown: false,
                        gestureEnabled: true,
                        animation: "fade",
                      }}
                    />
                    <Stack.Screen
                      name="+not-found"
                      options={{
                        animation: "fade",
                      }}
                    />
                    <Stack.Screen
                      name="checkout"
                      options={{
                        headerShown: false,
                        gestureEnabled: true,
                        headerBackVisible: false,
                        animation: "slide_from_bottom",
                        cardStyleInterpolator:
                          CardStyleInterpolators.forModalPresentationIOS,
                      }}
                    />
                    <Stack.Screen
                      name="success"
                      options={{
                        headerShown: false,
                        gestureEnabled: false,
                        headerBackVisible: false,
                        animation: "fade",
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
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function TabLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          paddingBottom: insets.bottom || 4,
          paddingTop: 2,
          backgroundColor: colorScheme === "dark" ? "#000000" : "#FFFFFF",
          borderTopColor: colorScheme === "dark" ? "#1C1C1E" : "#E5E5E5",
        },
        tabBarActiveTintColor: "#0A84FF",
        tabBarInactiveTintColor: colorScheme === "dark" ? "#666666" : "#8E8E93",
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
