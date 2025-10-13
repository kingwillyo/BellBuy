import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
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
import { logger } from "../lib/logger";
import { generateVerificationCode } from "../lib/product-utils";
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
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">(
    "pickup"
  );
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  const textColor = isDarkMode ? "#FFF" : "#000";
  const backgroundColor = isDarkMode ? "#000" : "#FFF";
  const insets = useSafeAreaInsets();
  const statusBarBg = backgroundColor;
  const statusBarStyle =
    colorScheme === "dark" ? "light-content" : "dark-content";
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
            logger.error("Error fetching address", error, {
              component: "Checkout",
            });
            setDeliveryAddress("Male Bronze 2 Annex");
          } else {
            setDeliveryAddress(data?.hostel || "Male Bronze 2 Annex");
          }
        } catch (error) {
          logger.error("Error fetching address", error, {
            component: "Checkout",
          });
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
  // Shipping fee only for delivery
  const shippingFee =
    deliveryMethod === "delivery" && cartItems.length > 0 ? 200 : 0;
  const totalWithFees = totalPrice + shippingFee;
  const amount = totalWithFees * 100;
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
    logger.debug(
      "WebView message received",
      {
        messageType: event.nativeEvent.data?.substring(0, 50) + "...",
      },
      { component: "Checkout" }
    );

    // Prevent duplicate processing
    if (isProcessingPayment || paymentProcessedRef.current) {
      logger.debug(
        "Payment already being processed, ignoring message",
        undefined,
        { component: "Checkout" }
      );
      return;
    }

    if (event.nativeEvent.data.startsWith("test-bridge:")) {
      logger.debug("Bridge test message received", undefined, {
        component: "Checkout",
      });
      return;
    }
    setWebViewLoading(false);

    let paymentReference: string | undefined;

    try {
      // Parse the WebView message data
      const messageData = event.nativeEvent.data;
      logger.debug(
        "Processing payment message",
        { messageLength: messageData.length },
        { component: "Checkout" }
      );

      let data: any;
      try {
        data = JSON.parse(messageData);
      } catch (parseError) {
        // Handle non-JSON messages (like paystack-error: messages)
        if (messageData.startsWith("paystack-error:")) {
          logger.warn(
            "Paystack error received",
            { errorType: "paystack-error" },
            { component: "Checkout" }
          );
          setIsProcessingPayment(false);
          return;
        }
        if (messageData.startsWith("paystack-opened")) {
          logger.info("Paystack payment interface opened", undefined, {
            component: "Checkout",
          });
          return;
        }
        // If it's not a known non-JSON message, throw the parsing error
        throw parseError;
      }

      paymentReference = data?.reference;
      if (data.status === "success") {
        setIsProcessingPayment(true);

        // Use the new smart checkout flow
        if (!user) {
          logger.error("User not authenticated during checkout", undefined, {
            component: "Checkout",
          });
          setIsProcessingPayment(false);
          return;
        }

        // Get access token
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;

        if (!accessToken) {
          logger.error(
            "Access token not available during checkout",
            undefined,
            { component: "Checkout" }
          );
          setIsProcessingPayment(false);
          return;
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();
        logger.debug(
          "Generated verification code",
          { verificationCode },
          { component: "Checkout" }
        );

        // Debug: Log the order data being sent
        const orderData = {
          user_id: user.id,
          cart_items: cartItems.map((item) => ({
            ...item,
            product: {
              ...item.product,
              effective_price: item.product.price,
            },
          })),
          reference: data.reference,
          delivery_address:
            deliveryMethod === "delivery" ? deliveryAddress : null,
          delivery_method: deliveryMethod,
          shipping_fee: shippingFee,
          verification_code: verificationCode,
        };

        logger.debug(
          "Fee calculation completed",
          {
            deliveryMethod,
            shippingFee,
            totalWithFees,
            cartItemsLength: cartItems.length,
            isDelivery: deliveryMethod === "delivery",
          },
          { component: "Checkout" }
        );

        logger.debug(
          "Order data prepared",
          {
            orderCount: Array.isArray(orderData) ? orderData.length : 1,
            deliveryMethod: deliveryMethod,
            cartItemsCount: cartItems.length,
          },
          { component: "Checkout" }
        );

        // Navigation helper function
        const navigateToSuccess = async (result: any, reference: string) => {
          logger.info("Navigating to success screen", undefined, {
            component: "Checkout",
          });

          // Clear cart and navigate to success
          await clearCart();

          // Mark payment as processed to prevent duplicate processing
          paymentProcessedRef.current = true;

          // Add a small delay to ensure state updates are complete
          setTimeout(() => {
            // Navigate to success; guard if orders array is missing/empty
            const hasOrders =
              Array.isArray(result?.orders) && result.orders.length > 0;
            const firstOrder = hasOrders ? result.orders[0] : null;
            try {
              router.replace({
                pathname: "/success",
                params: {
                  reference: String(reference || ""),
                  ...(firstOrder
                    ? {
                        order_id: String(firstOrder.id),
                        total_orders: String(result.orders.length),
                      }
                    : {}),
                },
              });
            } catch (_) {
              // Fallback: still navigate to success without params
              router.replace("/success");
            }
          }, 500);
        };

        // Manual order creation fallback function
        const createOrderManually = async (): Promise<any> => {
          logger.info(
            "Creating orders manually via direct Supabase API",
            undefined,
            { component: "Checkout" }
          );

          try {
            // Use the existing authenticated Supabase client
            const supabaseClient = supabase;

            // Group cart items by seller (same logic as edge function)
            const cartBySeller: { [sellerId: string]: any[] } = {};
            cartItems.forEach((item: any) => {
              const sellerId = item.product.user_id;
              if (!cartBySeller[sellerId]) {
                cartBySeller[sellerId] = [];
              }
              cartBySeller[sellerId].push(item);
            });

            const createdOrders: any[] = [];

            // Create orders for each seller
            for (const [sellerId, items] of Object.entries(cartBySeller)) {
              const subtotal = items.reduce(
                (sum: number, item: any) =>
                  sum + item.product.price * item.quantity,
                0
              );
              const total = subtotal + shippingFee;

              // Generate verification code for manual order creation
              const manualVerificationCode = generateVerificationCode();
              logger.debug(
                "Generated verification code for manual order",
                {
                  verificationCode: manualVerificationCode,
                  sellerId,
                },
                { component: "Checkout" }
              );

              // Create order
              const { data: orderData, error: orderError } =
                await supabaseClient
                  .from("orders")
                  .insert({
                    user_id: user.id,
                    seller_id: sellerId,
                    total_amount: total,
                    shipping_fee: shippingFee,
                    seller_payout: subtotal,
                    payment_status: "paid",
                    payout_status: "pending",
                    status: "pending",
                    reference: data.reference,
                    delivery_address:
                      deliveryMethod === "delivery" ? deliveryAddress : null,
                    delivery_method: deliveryMethod,
                    verification_code: manualVerificationCode,
                  })
                  .select()
                  .single();

              if (orderError) {
                logger.error(
                  `Manual order creation failed for seller ${sellerId}`,
                  orderError,
                  { component: "Checkout", sellerId }
                );
                throw orderError;
              }

              createdOrders.push(orderData);

              // Create order items
              const orderItems = items.map((item: any) => ({
                order_id: orderData.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_purchase: item.product.price,
              }));

              const { error: itemsError } = await supabaseClient
                .from("order_items")
                .insert(orderItems);

              if (itemsError) {
                logger.error("Manual order items creation failed", itemsError, {
                  component: "Checkout",
                  orderId: orderData.id,
                });
                // Continue with other orders even if items fail
              }
            }

            logger.info(
              "Manual order creation successful",
              { orderCount: createdOrders.length },
              { component: "Checkout" }
            );

            // Navigate to success screen after manual order creation
            await navigateToSuccess({ orders: createdOrders }, data.reference);

            return { success: true, orders: createdOrders };
          } catch (error) {
            logger.error("Manual order creation failed", error, {
              component: "Checkout",
            });
            throw new Error(
              "All order creation methods failed. Payment successful but no order created. Please contact support immediately."
            );
          }
        };

        // Send cart items to edge function for smart order creation with retry logic
        const createOrderWithRetry = async (retryCount = 0): Promise<any> => {
          const maxRetries = 3;
          const timeout = 15000; // 15 seconds timeout

          try {
            logger.debug(
              "Attempting to create order",
              { attempt: retryCount + 1, maxAttempts: maxRetries + 1 },
              { component: "Checkout" }
            );

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(
              "https://pdehjhhuceqmltpvosfh.supabase.co/functions/v1/create_order",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(orderData),
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorText = await response.text();
              logger.error(
                "Edge function error",
                {
                  status: response.status,
                  error: errorText,
                  attempt: retryCount + 1,
                },
                { component: "Checkout" }
              );
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            logger.info(
              "Orders created successfully",
              { attempt: retryCount + 1, orderCount: result?.orders?.length },
              { component: "Checkout" }
            );
            return result;
          } catch (error) {
            logger.error("Order creation failed", error, {
              component: "Checkout",
              attempt: retryCount + 1,
            });

            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
              logger.debug(
                "Retrying order creation",
                { delay, nextAttempt: retryCount + 2 },
                { component: "Checkout" }
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              return createOrderWithRetry(retryCount + 1);
            } else {
              // All retries failed - try manual order creation as last resort
              logger.warn(
                "All retry attempts failed. Attempting manual order creation",
                undefined,
                { component: "Checkout" }
              );
              return await createOrderManually();
            }
          }
        };

        const result = await createOrderWithRetry();

        // Navigate to success screen
        await navigateToSuccess(result, data.reference);
      } else if (data.status === "cancel") {
        logger.info("Payment cancelled, navigating back", undefined, {
          component: "Checkout",
        });
        router.back();
      }
    } catch (e) {
      logger.error(
        "Critical error during payment processing",
        {
          errorType: typeof e,
          message: e instanceof Error ? e.message : String(e),
          name: e instanceof Error ? e.name : "Unknown",
          stack: e instanceof Error ? e.stack : undefined,
        },
        { component: "Checkout" }
      );

      // Check if this is a JSON parsing error
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isJsonParseError =
        errorMessage.includes("JSON Parse error") ||
        errorMessage.includes("Unexpected character");

      if (isJsonParseError) {
        logger.error(
          "JSON parsing failed - likely invalid WebView message",
          { errorMessage },
          { component: "Checkout" }
        );
        Alert.alert(
          "Payment Error",
          "There was an error processing the payment response. Please try again.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        setIsProcessingPayment(false);
        return;
      }

      // Check if this is a payment reconciliation error
      const isPaymentReconciliationError =
        errorMessage.includes("Payment successful") ||
        errorMessage.includes("order creation failed");

      if (isPaymentReconciliationError) {
        // Payment was successful but order creation failed - show critical error
        Alert.alert(
          "Payment Processed - Action Required",
          "Your payment was successful, but there was an issue creating your order. Please contact support immediately with your payment reference: " +
            (paymentReference || "Unknown"),
          [
            {
              text: "Contact Support",
              onPress: () => {
                // You can add logic to open support contact here
                logger.info(
                  "User needs to contact support for payment reference",
                  { paymentReference },
                  { component: "Checkout" }
                );
              },
            },
            {
              text: "OK",
              onPress: () => router.replace("/"),
            },
          ]
        );
      } else {
        // Other errors - show generic error
        Alert.alert(
          "Payment Error",
          "There was an error processing your payment. Please try again.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }

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
    logger.debug(
      "Checkout not ready",
      { isLoading, hasUser: !!user },
      { component: "Checkout" }
    );
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor,
        }}
      >
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={statusBarBg}
          translucent
        />
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  // Show delivery address confirmation before payment
  if (!showAddressPicker && deliveryAddress) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={statusBarBg}
          translucent
        />
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

        {/* Delivery Method Selection */}
        <View style={styles.deliveryMethodSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Delivery Method
          </Text>
          <View style={styles.deliveryMethodOptions}>
            <TouchableOpacity
              style={[
                styles.deliveryMethodOption,
                {
                  backgroundColor:
                    deliveryMethod === "pickup"
                      ? "#0A84FF"
                      : isDarkMode
                      ? "#2A2D3A"
                      : "#F8F9FA",
                  borderColor:
                    deliveryMethod === "pickup"
                      ? "#0A84FF"
                      : isDarkMode
                      ? "#3A3D4A"
                      : "#E9ECEF",
                },
              ]}
              onPress={() => setDeliveryMethod("pickup")}
            >
              <Ionicons
                name="storefront-outline"
                size={20}
                color={deliveryMethod === "pickup" ? "#FFF" : "#0A84FF"}
              />
              <Text
                style={[
                  styles.deliveryMethodText,
                  { color: deliveryMethod === "pickup" ? "#FFF" : textColor },
                ]}
              >
                Pickup
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.deliveryMethodOption,
                styles.disabledOption,
                {
                  backgroundColor: isDarkMode ? "#1A1A1A" : "#F0F0F0",
                  borderColor: isDarkMode ? "#2A2A2A" : "#D0D0D0",
                },
              ]}
            >
              <Ionicons
                name="car-outline"
                size={20}
                color={isDarkMode ? "#666" : "#999"}
              />
              <View style={styles.comingSoonContainer}>
                <Text
                  style={[
                    styles.deliveryMethodText,
                    styles.disabledText,
                    { color: isDarkMode ? "#666" : "#999" },
                  ]}
                >
                  Delivery
                </Text>
                <Text
                  style={[
                    styles.comingSoonText,
                    { color: isDarkMode ? "#888" : "#777" },
                  ]}
                >
                  Coming Soon
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Address Section - only show when delivery is selected */}
        {deliveryMethod === "delivery" && (
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
        )}

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Order Summary
          </Text>
          {/* Super Flash Sale Savings */}
          {(() => {
            const totalSavings = 0;

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
            {deliveryMethod === "delivery" && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryText, { color: textColor }]}>
                  Shipping
                </Text>
                <Text style={[styles.summaryText, { color: textColor }]}>
                  ₦{shippingFee}
                </Text>
              </View>
            )}
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
                ₦{totalWithFees.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Proceed to Payment Button */}
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => setShowAddressPicker(true)}
          disabled={
            addressLoading ||
            (deliveryMethod === "delivery" && !deliveryAddress.trim())
          }
        >
          <Text style={styles.payButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  logger.debug(
    "Rendering WebView",
    { webViewLoading },
    { component: "Checkout" }
  );

  return (
    <View key={`checkout-${reference}`} style={{ flex: 1, backgroundColor }}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBg}
        translucent
      />
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
          logger.debug("WebView loading started", undefined, {
            component: "Checkout",
          });
          setWebViewLoading(true);
        }}
        onLoadEnd={() => {
          logger.debug("WebView loading ended", undefined, {
            component: "Checkout",
          });
          setWebViewLoading(false);
        }}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error("WebView error", nativeEvent, { component: "Checkout" });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error("WebView HTTP error", nativeEvent, {
            component: "Checkout",
          });
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
  deliveryMethodSection: {
    marginBottom: 24,
  },
  deliveryMethodOptions: {
    flexDirection: "row",
    gap: 12,
  },
  deliveryMethodOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  deliveryMethodText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledOption: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.7,
  },
  comingSoonContainer: {
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    fontStyle: "italic",
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
