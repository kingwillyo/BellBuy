import { Stack, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useCart } from "../context/CartContext";
import { useAuth } from "../hooks/useAuth";

export default function CheckoutScreen() {
  // All hooks at the top, no early returns
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { cartItems, totalPrice } = useCart();
  const webviewRef = useRef(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const textColor = isDarkMode ? "#FFF" : "#000";
  const backgroundColor = isDarkMode ? "#181A20" : "#FFF";
  // Generate a stable reference only once per session
  const referenceRef = useRef(user ? `${user.id}_${Date.now()}` : "");
  const reference = referenceRef.current;

  // Only render WebView when auth is ready and user exists
  const isReady = !isLoading && !!user;

  useEffect(() => {
    if (!isLoading && !user) {
      router.back();
    }
  }, [user, isLoading, router]);

  // Calculate total in kobo (Paystack expects NGN kobo)
  const amount = totalPrice * 100;
  const email = user?.email || "";

  // Paystack Inline HTML
  const paystackHTML = `
    <html>
      <head>
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
        <style>
          body { 
            background: ${backgroundColor}; 
            color: ${textColor}; 
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
        </style>
      </head>
      <body>
        <script src=\"https://js.paystack.co/v1/inline.js\"></script>
        <script>
          function sendToReactNative(msg) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(msg);
            }
          }
          
          // Open Paystack immediately when page loads
          window.onload = function() {
            try {
              var handler = PaystackPop.setup({
                key: 'pk_test_4ae45098ac10fe2fc9f9abd93e8861dd4e2e4898',
                email: '${email}',
                amount: ${amount},
                ref: '${reference}',
                callback: function(response) {
                  sendToReactNative(JSON.stringify({ status: 'success', reference: response.reference }));
                },
                onClose: function() {
                  sendToReactNative(JSON.stringify({ status: 'cancel' }));
                }
              });
              handler.openIframe();
              sendToReactNative('paystack-opened');
            } catch (e) {
              sendToReactNative('paystack-error: ' + e.message);
            }
          }
        </script>
      </body>
    </html>
  `;

  const handleWebViewMessage = (event: any) => {
    console.log("[Checkout] WebView message received:", event.nativeEvent.data);
    if (event.nativeEvent.data.startsWith("test-bridge:")) {
      console.log("[Checkout] Bridge test message:", event.nativeEvent.data);
      return;
    }
    // Dismiss loading overlay on any message that is not a bridge test
    setWebViewLoading(false);

    if (event.nativeEvent.data.startsWith("paystack-error:")) {
      console.log("[Checkout] Paystack error:", event.nativeEvent.data);
      return;
    }
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === "success") {
        console.log(
          "[Checkout] Payment success, navigating to /success",
          data.reference
        );
        // When payment is successful and you navigate to the success page, do:
        router.replace({
          pathname: "/success",
          params: {
            reference: data.reference,
            seller_id: cartItems[0]?.product?.user_id,
            total_amount: totalPrice,
            shipping_fee: 200, // or your actual shipping fee variable
            product_price: cartItems[0]?.product?.price, // pass product price
          },
        });
      } else if (data.status === "cancel") {
        console.log("[Checkout] Payment cancelled, navigating back");
        router.back();
      }
    } catch (e) {
      console.log("[Checkout] Error parsing WebView message:", e);
    }
  };

  React.useEffect(() => {
    if (webViewLoading) {
      const timeout = setTimeout(() => {
        setWebViewLoading(false);
      }, 5000); // fallback after 5 seconds
      return () => clearTimeout(timeout);
    }
  }, [webViewLoading]);

  // Only render WebView when ready, otherwise show loading spinner
  if (!isReady) {
    console.log("[Checkout] Not ready: isLoading:", isLoading, "user:", user);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor,
        }}
      >
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  console.log("[Checkout] Rendering WebView, webViewLoading:", webViewLoading);

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: paystackHTML }}
        onMessage={handleWebViewMessage}
        startInLoadingState={false}
        onLoadStart={() => {
          console.log("[Checkout] WebView loading started");
          setWebViewLoading(true);
        }}
        onLoadEnd={() => {
          console.log("[Checkout] WebView loading ended");
          setWebViewLoading(false);
        }}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
      />
      {webViewLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text
            style={{ color: textColor, marginTop: 12, textAlign: "center" }}
          >
            Initializing payment...
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
