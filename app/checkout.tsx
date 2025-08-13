import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useCart } from "../context/CartContext";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function CheckoutScreen() {
  // All hooks at the top, no early returns
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { cartItems, totalPrice, clearCart } = useCart();
  const webviewRef = useRef(null);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const textColor = isDarkMode ? "#FFF" : "#000";
  const backgroundColor = isDarkMode ? "#000" : "#FFF";
  const insets = useSafeAreaInsets();
  // Generate a stable reference only once per session
  const referenceRef = useRef(user ? `${user.id}_${Date.now()}` : "");
  const reference = referenceRef.current;

  // Only render WebView when auth is ready and user exists
  const isReady = !isLoading && !!user;

  // Fetch user's delivery address - refetch every time user returns to this screen
  useFocusEffect(
    useCallback(() => {
      const fetchAddress = async () => {
        if (!user) return;

        setAddressLoading(true);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("hostel")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching address:", error);
            setDeliveryAddress("Male Bronze 2 Annex");
          } else {
            setDeliveryAddress(data?.hostel || "Male Bronze 2 Annex");
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setDeliveryAddress("Male Bronze 2 Annex");
        } finally {
          setAddressLoading(false);
        }
      };

      fetchAddress();
    }, [user])
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.back();
    }
  }, [user, isLoading, router]);

  // Calculate total in kobo (Paystack expects NGN kobo)
  const totalWithShipping = totalPrice + (cartItems.length > 0 ? 200 : 0);
  const amount = totalWithShipping * 100;
  const email = user?.email || "";

  // Paystack Inline HTML
  const paystackHTML = `
    <html>
      <head>
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, viewport-fit=cover\">
        <style>
          :root { 
            /* iOS safe area fallback for older versions */
            --safe-top: constant(safe-area-inset-top); 
            --safe-right: constant(safe-area-inset-right);
            --safe-bottom: constant(safe-area-inset-bottom);
            --safe-left: constant(safe-area-inset-left);
          }
          body { 
            background: ${backgroundColor}; 
            color: ${textColor}; 
            margin: 0;
            padding: env(safe-area-inset-top, var(--safe-top)) env(safe-area-inset-right, var(--safe-right)) env(safe-area-inset-bottom, var(--safe-bottom)) env(safe-area-inset-left, var(--safe-left));
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <script src=\"https://js.paystack.co/v1/inline.js\"></script>
        <script>
          let hasProcessedPayment = false;
          
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
                  if (!hasProcessedPayment) {
                    hasProcessedPayment = true;
                    sendToReactNative(JSON.stringify({ status: 'success', reference: response.reference }));
                  }
                },
                onClose: function() {
                  if (!hasProcessedPayment) {
                    hasProcessedPayment = true;
                    sendToReactNative(JSON.stringify({ status: 'cancel' }));
                  }
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

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const paymentProcessedRef = useRef(false);

  const handleWebViewMessage = async (event: any) => {
    console.log("[Checkout] WebView message received:", event.nativeEvent.data);

    // Prevent duplicate processing
    if (isProcessingPayment || paymentProcessedRef.current) {
      console.log(
        "[Checkout] Payment already being processed or completed, ignoring message"
      );
      return;
    }

    if (event.nativeEvent.data.startsWith("test-bridge:")) {
      console.log("[Checkout] Bridge test message:", event.nativeEvent.data);
      return;
    }
    setWebViewLoading(false);

    if (event.nativeEvent.data.startsWith("paystack-error:")) {
      console.log("[Checkout] Paystack error:", event.nativeEvent.data);
      return;
    }

    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === "success") {
        setIsProcessingPayment(true);

        // Use the new smart checkout flow
        if (!user) {
          console.error("[Checkout] No user found");
          setIsProcessingPayment(false);
          return;
        }

        // Get access token
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
          console.error("[Checkout] No access token found");
          setIsProcessingPayment(false);
          return;
        }

        // Send cart items to edge function for smart order creation
        const response = await fetch(
          "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              buyer_id: user.id,
              cart_items: cartItems.map((item) => ({
                ...item,
                product: {
                  ...item.product,
                  effective_price:
                    item.product.is_super_flash_sale &&
                    item.product.super_flash_price
                      ? item.product.super_flash_price
                      : item.product.price,
                },
              })),
              reference: data.reference,
              delivery_address: deliveryAddress,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Checkout] Edge function error:", errorText);
          throw new Error("Failed to create orders");
        }

        const result = await response.json();
        console.log("[Checkout] Orders created successfully:", result);

        // Clear cart and navigate to success
        await clearCart();

        // Mark payment as processed to prevent duplicate processing
        paymentProcessedRef.current = true;

        // Add a small delay to ensure state updates are complete
        setTimeout(() => {
          // Navigate to success with the first order's details for display
          const firstOrder = result.orders[0];
          router.replace({
            pathname: "/success",
            params: {
              reference: data.reference,
              order_id: firstOrder.id.toString(),
              total_orders: result.orders.length.toString(),
            },
          });
        }, 500);
      } else if (data.status === "cancel") {
        console.log("[Checkout] Payment cancelled, navigating back");
        router.back();
      }
    } catch (e) {
      console.log("[Checkout] Error parsing WebView message:", e);
      setIsProcessingPayment(false);
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

  // Cleanup function to reset payment processed flag
  React.useEffect(() => {
    return () => {
      paymentProcessedRef.current = false;
      setIsProcessingPayment(false);
    };
  }, []);

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

  // Show delivery address confirmation before payment
  if (!showAddressPicker && deliveryAddress) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            gestureEnabled: true,
            headerBackVisible: false,
          }}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0A84FF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Checkout
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Delivery Address Section */}
        <View style={styles.addressSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Delivery Address
          </Text>
          <View
            style={[
              styles.addressCard,
              { backgroundColor: isDarkMode ? "#2A2D3A" : "#F8F9FA" },
            ]}
          >
            <View style={styles.addressContent}>
              <Ionicons name="location-outline" size={20} color="#0A84FF" />
              {addressLoading ? (
                <View style={styles.addressLoading}>
                  <ActivityIndicator size="small" color="#0A84FF" />
                  <Text
                    style={[
                      styles.addressText,
                      { color: textColor, marginLeft: 8 },
                    ]}
                  >
                    Loading address...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.addressText, { color: textColor }]}>
                  {deliveryAddress}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => router.push("/account/address")}
            >
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Order Summary
          </Text>
          {/* Super Flash Sale Savings */}
          {(() => {
            const totalSavings = cartItems.reduce((savings, item) => {
              if (
                item.product.is_super_flash_sale &&
                item.product.super_flash_price
              ) {
                return (
                  savings +
                  (item.product.price - item.product.super_flash_price) *
                    item.quantity
                );
              }
              return savings;
            }, 0);

            if (totalSavings > 0) {
              return (
                <View
                  style={[
                    styles.savingsCard,
                    { backgroundColor: isDarkMode ? "#2A2D3A" : "#F8F9FA" },
                  ]}
                >
                  <Text style={[styles.savingsText, { color: "#FF3B30" }]}>
                    🔥 You saved ₦{Math.round(totalSavings).toLocaleString()}{" "}
                    with Super Flash Sale!
                  </Text>
                </View>
              );
            }
            return null;
          })()}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: isDarkMode ? "#2A2D3A" : "#F8F9FA" },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: textColor }]}>
                Items ({cartItems.length})
              </Text>
              <Text style={[styles.summaryText, { color: textColor }]}>
                ₦{totalPrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryText, { color: textColor }]}>
                Shipping
              </Text>
              <Text style={[styles.summaryText, { color: textColor }]}>
                ₦200
              </Text>
            </View>
            <View
              style={[
                styles.divider,
                { backgroundColor: isDarkMode ? "#3A3D4A" : "#E9ECEF" },
              ]}
            />
            <View style={styles.summaryRow}>
              <Text style={[styles.totalText, { color: textColor }]}>
                Total
              </Text>
              <Text style={[styles.totalText, { color: textColor }]}>
                ₦{totalWithShipping.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Proceed to Payment Button */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => setShowAddressPicker(true)}
          disabled={addressLoading || !deliveryAddress.trim()}
        >
          <Text style={styles.payButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log("[Checkout] Rendering WebView, webViewLoading:", webViewLoading);

  return (
    <View key={`checkout-${reference}`} style={{ flex: 1, backgroundColor }}>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          headerBackVisible: false,
        }}
      />
      <WebView
        key={`webview-${reference}`}
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: paystackHTML }}
        onMessage={handleWebViewMessage}
        startInLoadingState={false}
        contentInset={{
          top: insets.top,
          bottom: insets.bottom,
          left: 0,
          right: 0,
        }}
        contentInsetAdjustmentBehavior="never"
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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("[Checkout] WebView error:", nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("[Checkout] WebView HTTP error:", nativeEvent);
        }}
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
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  addressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  addressCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  addressText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  addressLoading: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  changeButton: {
    backgroundColor: "#0A84FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  payButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  payButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
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
  savingsCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
