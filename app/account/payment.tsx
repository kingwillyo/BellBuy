import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// TypeScript interfaces
interface BankAccount {
  id: string;
  seller_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
}

interface Order {
  id: number;
  product_name: string;
  amount: number;
  status: string;
  verification_code?: string;
  created_at: string;
}

interface Payout {
  id: string;
  order_id: number;
  amount: number;
  status: "pending" | "success" | "failed";
  created_at: string;
}

type TabType = "bank" | "orders" | "payouts";

export default function PaymentScreen() {
  const { user, isLoading } = useAuth();

  // State management
  const [activeTab, setActiveTab] = useState<TabType>("bank");
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Bank account form state
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);

  // Verification code state
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);

  // Theme colors
  const cardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background"
  );
  const textColor = useThemeColor({}, "text");
  const accent = useThemeColor({ light: "#0A84FF", dark: "#4F8EF7" }, "text");
  const borderColor = useThemeColor(
    { light: "#E5E5E5", dark: "#333333" },
    "background"
  );
  const backgroundColor = useThemeColor(
    { light: "#FFFFFF", dark: "#000000" },
    "background"
  );

  // Data fetching functions
  const fetchBankAccount = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("seller_bank_accounts")
        .select("*")
        .eq("seller_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      setBankAccount(data);
    } catch (err) {
      console.error("Error fetching bank account:", err);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          total_amount,
          status,
          verification_code,
          created_at,
          order_items (
            product:products (
              name
            )
          )
        `
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedOrders: Order[] = data.map((order) => ({
        id: order.id,
        product_name:
          (order.order_items as any)?.[0]?.product?.name || "Unknown Product",
        amount: order.total_amount,
        status: order.status,
        verification_code: order.verification_code,
        created_at: order.created_at,
      }));

      setOrders(formattedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders");
    }
  };

  const fetchPayouts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(
          `
          id,
          order_id,
          amount,
          status,
          created_at,
          orders (
            order_items (
              product:products (
                name
              )
            )
          )
        `
        )
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedPayouts: Payout[] = data.map((payout) => ({
        id: payout.id,
        order_id: payout.order_id,
        amount: payout.amount,
        status: payout.status,
        created_at: payout.created_at,
      }));

      setPayouts(formattedPayouts);
    } catch (err) {
      console.error("Error fetching payouts:", err);
      setError("Failed to load payouts");
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user) {
      fetchBankAccount();
      fetchOrders();
      fetchPayouts();
    }
  }, [user]);

  // Bank account management functions
  const verifyAccountNumber = async () => {
    if (!accountNumber || accountNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid account number");
      return;
    }

    setIsVerifyingAccount(true);
    try {
      // Mock verification - in real app, call Paystack API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock account name based on account number
      const mockAccountName = `Account Holder ${accountNumber.slice(-4)}`;
      setAccountName(mockAccountName);

      Alert.alert("Success", `Account verified: ${mockAccountName}`);
    } catch (err) {
      Alert.alert("Error", "Failed to verify account number");
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  const saveBankAccount = async () => {
    if (!user) return;
    if (!bankName || !accountNumber || !accountName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("seller_bank_accounts").upsert({
        seller_id: user.id,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });

      if (error) throw error;

      Alert.alert("Success", "Bank account saved successfully");
      await fetchBankAccount();
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      Alert.alert("Error", "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  };

  // Order verification and payout functions
  const verifyOrderCode = async (orderId: number) => {
    if (!user) return;
    if (!verificationCode) {
      Alert.alert("Error", "Please enter verification code");
      return;
    }

    setLoading(true);
    try {
      // Find the order and verify the code
      const order = orders.find((o) => o.id === orderId);
      if (!order || order.verification_code !== verificationCode) {
        Alert.alert("Error", "Invalid verification code");
        return;
      }

      // Update order status to completed
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // Create payout record
      const { error: payoutError } = await supabase.from("payouts").insert({
        seller_id: user.id,
        order_id: orderId,
        amount: order.amount,
        status: "pending",
      });

      if (payoutError) throw payoutError;

      // Mock payout processing (in real app, call Supabase Edge Function)
      setTimeout(async () => {
        try {
          const { error: updateError } = await supabase
            .from("payouts")
            .update({ status: "success" })
            .eq("order_id", orderId);

          if (updateError) throw updateError;

          Alert.alert("Success", "Order verified and payout initiated");
          await fetchOrders();
          await fetchPayouts();
        } catch (err) {
          console.error("Error updating payout:", err);
        }
      }, 3000);

      Alert.alert(
        "Success",
        "Order verified! Payout will be processed shortly."
      );
      setVerificationCode("");
      setVerifyingOrderId(null);
      await fetchOrders();
    } catch (err) {
      Alert.alert("Error", "Failed to verify order");
    } finally {
      setLoading(false);
    }
  };

  // Render functions
  const renderTabButton = (
    tab: TabType,
    title: string,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { borderBottomColor: activeTab === tab ? accent : "transparent" },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tab ? accent : textColor}
        style={styles.tabIcon}
      />
      <ThemedText
        style={[
          styles.tabText,
          { color: activeTab === tab ? accent : textColor },
        ]}
      >
        {title}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderBankAccountSection = () => (
    <ScrollView style={styles.section}>
      {bankAccount ? (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={[styles.cardTitle, { color: accent }]}>
            Bank Account Details
          </ThemedText>
          <View style={styles.bankDetails}>
            <ThemedText style={[styles.bankLabel, { color: textColor }]}>
              Bank: {bankAccount.bank_name}
            </ThemedText>
            <ThemedText style={[styles.bankLabel, { color: textColor }]}>
              Account: {bankAccount.account_number}
            </ThemedText>
            <ThemedText style={[styles.bankLabel, { color: textColor }]}>
              Name: {bankAccount.account_name}
            </ThemedText>
          </View>
          <Button
            title="Update Bank Account"
            onPress={() => setActiveTab("bank")}
            variant="outline"
            style={styles.updateButton}
          />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <ThemedText style={[styles.cardTitle, { color: accent }]}>
            Setup Bank Account
          </ThemedText>
          <ThemedText style={[styles.cardSubtitle, { color: textColor }]}>
            Add your bank account details to receive payouts
          </ThemedText>

          <Input
            label="Bank Name"
            value={bankName}
            onChangeText={setBankName}
            placeholder="Enter bank name"
            style={styles.input}
          />

          <Input
            label="Account Number"
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="Enter account number"
            keyboardType="numeric"
            style={styles.input}
            rightIcon="checkmark-circle"
            onRightIconPress={verifyAccountNumber}
          />

          {accountName ? (
            <Input
              label="Account Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Account holder name"
              style={styles.input}
              editable={false}
            />
          ) : null}

          <Button
            title={isVerifyingAccount ? "Verifying..." : "Verify Account"}
            onPress={verifyAccountNumber}
            loading={isVerifyingAccount}
            disabled={!accountNumber || isVerifyingAccount}
            style={styles.verifyButton}
          />

          <Button
            title="Save Bank Account"
            onPress={saveBankAccount}
            loading={loading}
            disabled={!bankName || !accountNumber || !accountName}
            style={styles.saveButton}
          />
        </View>
      )}
    </ScrollView>
  );

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={[styles.container, { backgroundColor }]}>
          <Header title="Payment & Payouts" showBackButton />
          <LoadingScreen />
        </ThemedView>
      </>
    );
  }

  // Return null if not authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <Header title="Payment & Payouts" showBackButton />

        <View style={[styles.tabContainer, { borderBottomColor: borderColor }]}>
          {renderTabButton("bank", "Bank Account", "card")}
          {renderTabButton("orders", "Orders", "receipt")}
          {renderTabButton("payouts", "Payouts", "cash")}
        </View>

        {activeTab === "bank" && renderBankAccountSection()}
        {activeTab === "orders" && (
          <ScrollView style={styles.section}>
            {orders.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
                <Ionicons name="receipt-outline" size={48} color={textColor} />
                <ThemedText style={[styles.emptyText, { color: textColor }]}>
                  No orders found
                </ThemedText>
              </View>
            ) : (
              orders.map((order) => (
                <View
                  key={order.id}
                  style={[styles.card, { backgroundColor: cardBg }]}
                >
                  <View style={styles.orderHeader}>
                    <ThemedText
                      style={[styles.orderTitle, { color: textColor }]}
                    >
                      {order.product_name}
                    </ThemedText>
                    <ThemedText style={[styles.orderAmount, { color: accent }]}>
                      ₦{order.amount.toLocaleString()}
                    </ThemedText>
                  </View>

                  <View style={styles.orderDetails}>
                    <ThemedText
                      style={[styles.orderStatus, { color: textColor }]}
                    >
                      Status: {order.status}
                    </ThemedText>
                    <ThemedText
                      style={[styles.orderDate, { color: textColor }]}
                    >
                      {new Date(order.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>

                  {order.status === "awaiting_pickup" && (
                    <View style={styles.verificationSection}>
                      <Input
                        label="Verification Code"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        placeholder="Enter verification code"
                        style={styles.verificationInput}
                      />
                      <Button
                        title="Confirm Pickup"
                        onPress={() => verifyOrderCode(order.id)}
                        loading={loading && verifyingOrderId === order.id}
                        disabled={!verificationCode}
                        size="small"
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}
        {activeTab === "payouts" && (
          <ScrollView style={styles.section}>
            {payouts.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: cardBg }]}>
                <Ionicons name="cash-outline" size={48} color={textColor} />
                <ThemedText style={[styles.emptyText, { color: textColor }]}>
                  No payouts found
                </ThemedText>
              </View>
            ) : (
              payouts.map((payout) => (
                <View
                  key={payout.id}
                  style={[styles.card, { backgroundColor: cardBg }]}
                >
                  <View style={styles.payoutHeader}>
                    <ThemedText
                      style={[styles.payoutTitle, { color: textColor }]}
                    >
                      Order #{payout.order_id}
                    </ThemedText>
                    <ThemedText
                      style={[styles.payoutAmount, { color: accent }]}
                    >
                      ₦{payout.amount.toLocaleString()}
                    </ThemedText>
                  </View>

                  <View style={styles.payoutDetails}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            payout.status === "success"
                              ? "#34C759"
                              : payout.status === "pending"
                              ? "#FF9500"
                              : "#FF3B30",
                        },
                      ]}
                    >
                      <ThemedText style={styles.statusText}>
                        {payout.status.toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText
                      style={[styles.payoutDate, { color: textColor }]}
                    >
                      {new Date(payout.created_at).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 2,
  },
  tabIcon: {
    marginRight: Spacing.sm,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  section: {
    flex: 1,
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.md,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.lg,
  },
  bankDetails: {
    marginBottom: Spacing.lg,
  },
  bankLabel: {
    fontSize: Typography.sizes.md,
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.lg,
  },
  verifyButton: {
    marginBottom: Spacing.md,
  },
  saveButton: {
    marginBottom: Spacing.sm,
  },
  updateButton: {
    marginTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxxl,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    marginTop: Spacing.lg,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  orderTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    marginRight: Spacing.md,
  },
  orderAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  orderStatus: {
    fontSize: Typography.sizes.sm,
  },
  orderDate: {
    fontSize: Typography.sizes.sm,
  },
  verificationSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  verificationInput: {
    marginBottom: Spacing.md,
  },
  payoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  payoutTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    marginRight: Spacing.md,
  },
  payoutAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  payoutDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: "#FFFFFF",
  },
  payoutDate: {
    fontSize: Typography.sizes.sm,
  },
});
