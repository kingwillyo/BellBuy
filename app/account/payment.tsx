import { Header } from "@/components/Header";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BorderRadius, Shadows, Spacing, Typography } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
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
  is_verified: boolean;
  verified_at?: string;
  verification_method: string;
  bank_code?: string;
  bank_id?: number;
}

interface Order {
  id: number;
  product_name: string;
  amount: number;
  seller_payout: number;
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

// Nigerian banks list - Updated from Paystack API
const NIGERIAN_BANKS = [
  "9mobile 9Payment Service Bank",
  "Abbey Mortgage Bank",
  "Access Bank",
  "Access Bank (Diamond)",
  "AG Mortgage Bank",
  "Airtel Smartcash PSB",
  "ALAT by WEMA",
  "Alpha Morgan Bank",
  "Alternative bank",
  "ASO Savings and Loans",
  "Brent Mortgage bank",
  "Carbon",
  "Citibank Nigeria",
  "CITYCODE MORTAGE BANK",
  "Coronation Merchant Bank",
  "County Finance Limited",
  "Credit Direct Limited",
  "Ecobank Nigeria",
  "EXCEL FINANCE BANK",
  "Eyowo",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank",
  "FirstTrust Mortgage Bank Nigeria",
  "FSDH Merchant Bank Limited",
  "Gateway Mortgage Bank LTD",
  "Globus Bank",
  "GoMoney",
  "Greenwich Merchant Bank",
  "Guaranty Trust Bank",
  "HopePSB",
  "Ibom Mortgage Bank",
  "IMPERIAL HOMES MORTAGE BANK",
  "Infinity trust  Mortgage Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "KONGAPAY (Kongapay Technologies Limited)(formerly Zinternet)",
  "Kuda Bank",
  "Lagos Building Investment Company Plc.",
  "Living Trust Mortgage Bank",
  "Lotus Bank",
  "Money Master PSB",
  "MTN Momo PSB",
  "NOVA BANK",
  "NSUK MICROFINANACE BANK",
  "OPay Digital Services Limited (OPay)",
  "Optimus Bank Limited",
  "Paga",
  "PalmPay",
  "Parallex Bank",
  "Parkway - ReadyCash",
  "Paystack-Titan",
  "Petra Mircofinance Bank Plc",
  "Platinum Mortgage Bank",
  "Pocket App",
  "Polaris Bank",
  "PremiumTrust Bank",
  "PROSPERIS FINANCE LIMITED",
  "Providus Bank",
  "Rand Merchant Bank",
  "Refuge Mortgage Bank",
  "SAGE GREY FINANCE LIMITED",
  "Signature Bank Ltd",
  "Sparkle Microfinance Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "STB Mortgage Bank",
  "Sterling Bank",
  "Suntrust Bank",
  "TAJ Bank",
  "Tangerine Money",
  "TENN",
  "Titan Bank",
  "Union Bank of Nigeria",
  "United Bank For Africa",
  "Unity Bank",
  "Vale Finance Limited",
  "VFD Microfinance Bank Limited",
  "Wema Bank",
  "Xpress Wallet",
  "Zenith Bank",
];

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
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Edit mode state
  const [isEditingBankAccount, setIsEditingBankAccount] = useState(false);
  const [originalBankAccount, setOriginalBankAccount] =
    useState<BankAccount | null>(null);

  // Verification code state - use object to store codes per order
  const [verificationCodes, setVerificationCodes] = useState<{
    [orderId: number]: string;
  }>({});
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<{
    [orderId: number]: boolean;
  }>({});

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
  const labelColor = useThemeColor(
    { light: "#8F9BB3", dark: "#8F9BB3" },
    "text"
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
          seller_payout,
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
        seller_payout: order.seller_payout,
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

    if (!bankName) {
      Alert.alert("Error", "Please select a bank name first");
      return;
    }

    setIsVerifyingAccount(true);
    try {
      // Call the real Paystack API through our edge function
      const { data, error } = await supabase.functions.invoke(
        "verify-bank-account",
        {
          body: {
            account_number: accountNumber,
            bank_name: bankName,
          },
        }
      );

      if (error) {
        console.error("Bank verification error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        Alert.alert(
          "Verification Failed",
          error.message ||
            "Failed to verify account number. Please check your internet connection and try again."
        );
        return;
      }

      if (data?.success) {
        setAccountName(data.account_name);
        Alert.alert(
          "Account Verified!",
          `Account holder: ${data.account_name}\nAccount: ${data.account_number}`,
          [{ text: "OK", style: "default" }]
        );
      } else {
        Alert.alert(
          "Verification Failed",
          data?.error || "Invalid account number or bank"
        );
      }
    } catch (err: any) {
      console.error("Bank verification error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));

      let errorMessage = "Failed to verify account number. Please try again.";

      if (
        err.message?.includes("Edge Function returned a non-2xx status code")
      ) {
        errorMessage =
          "Bank verification service is currently unavailable. Please try again later.";
      } else if (err.message?.includes("Network")) {
        errorMessage = "Please check your internet connection and try again.";
      }

      Alert.alert("Error", errorMessage);
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
        is_verified: true, // Mark as verified since we verified it through Paystack
        verification_method: "api", // Indicate it was verified via API
        verified_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert("Success", "Bank account saved and verified successfully");
      await fetchBankAccount();
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      setIsEditingBankAccount(false);
    } catch (err) {
      Alert.alert("Error", "Failed to save bank account");
    } finally {
      setLoading(false);
    }
  };

  // Edit bank account functions
  const startEditingBankAccount = () => {
    if (bankAccount) {
      setOriginalBankAccount(bankAccount);
      setBankName(bankAccount.bank_name);
      setAccountNumber(bankAccount.account_number);
      setAccountName(bankAccount.account_name);
      setIsEditingBankAccount(true);
    }
  };

  const cancelEditingBankAccount = () => {
    setIsEditingBankAccount(false);
    setBankName("");
    setAccountNumber("");
    setAccountName("");
    setOriginalBankAccount(null);
  };

  const updateBankAccount = async () => {
    if (!user || !bankAccount) return;
    if (!bankName || !accountNumber || !accountName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("seller_bank_accounts")
        .update({
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          is_verified: true, // Mark as verified since we verified it through Paystack
          verification_method: "api", // Indicate it was verified via API
          verified_at: new Date().toISOString(),
        })
        .eq("id", bankAccount.id);

      if (error) throw error;

      Alert.alert("Success", "Bank account updated successfully");
      await fetchBankAccount();
      setIsEditingBankAccount(false);
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    } catch (err) {
      Alert.alert("Error", "Failed to update bank account");
    } finally {
      setLoading(false);
    }
  };

  // Order verification and payout functions
  const verifyOrderCode = async (orderId: number) => {
    if (!user) return;
    const verificationCode = verificationCodes[orderId];
    if (!verificationCode) {
      Alert.alert("Error", "Please enter verification code");
      return;
    }

    setLoading(true);
    setVerifyingOrderId(orderId);
    try {
      console.log("Calling verify-code function with:", {
        verification_code: verificationCode.trim(),
        order_id: orderId,
        seller_id: user.id,
      });

      const { data, error } = await supabase.functions.invoke(
        "verify-code-final",
        {
          body: {
            verification_code: verificationCode.trim(),
            order_id: orderId,
            seller_id: user.id,
          },
        }
      );

      console.log("Function response:", { data, error });

      if (error) {
        console.error("Verification error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        Alert.alert("Error", error.message || "Failed to verify code");
        return;
      }

      if (data?.success) {
        Alert.alert(
          "Success!",
          "Order completed successfully! Payout has been initiated.",
          [
            {
              text: "OK",
              onPress: async () => {
                // Clear the verification code for this order
                setVerificationCodes((prev) => {
                  const updated = { ...prev };
                  delete updated[orderId];
                  return updated;
                });
                setVerifyingOrderId(null);
                await fetchOrders();
                await fetchPayouts();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", data?.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
      setVerifyingOrderId(null);
    }
  };

  // Helper function to update verification code for specific order
  const updateVerificationCode = (orderId: number, code: string) => {
    setVerificationCodes((prev) => ({
      ...prev,
      [orderId]: code,
    }));
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
      {bankAccount && !isEditingBankAccount ? (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={[styles.cardTitle, { color: accent }]}>
              Bank Account Details
            </ThemedText>
            <TouchableOpacity
              onPress={startEditingBankAccount}
              style={[styles.editButton, { borderColor: accent }]}
            >
              <Ionicons name="create-outline" size={16} color={accent} />
              <ThemedText style={[styles.editButtonText, { color: accent }]}>
                Edit
              </ThemedText>
            </TouchableOpacity>
          </View>
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
            <View style={styles.verificationStatus}>
              <Ionicons
                name={
                  bankAccount.is_verified ? "checkmark-circle" : "alert-circle"
                }
                size={16}
                color={bankAccount.is_verified ? "#34C759" : "#FF9500"}
              />
              <ThemedText
                style={[
                  styles.verificationText,
                  { color: bankAccount.is_verified ? "#34C759" : "#FF9500" },
                ]}
              >
                {bankAccount.is_verified
                  ? `Verified via ${bankAccount.verification_method.toUpperCase()}`
                  : "Not verified"}
              </ThemedText>
            </View>
            {bankAccount.verified_at && (
              <ThemedText
                style={[styles.verificationDate, { color: labelColor }]}
              >
                Verified:{" "}
                {new Date(bankAccount.verified_at).toLocaleDateString()}
              </ThemedText>
            )}
          </View>
        </View>
      ) : bankAccount && isEditingBankAccount ? (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={[styles.cardTitle, { color: accent }]}>
              Edit Bank Account
            </ThemedText>
            <TouchableOpacity
              onPress={cancelEditingBankAccount}
              style={[styles.cancelButton, { borderColor: "#FF3B30" }]}
            >
              <Ionicons name="close-outline" size={16} color="#FF3B30" />
              <ThemedText
                style={[styles.cancelButtonText, { color: "#FF3B30" }]}
              >
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.input}>
            <ThemedText style={[styles.inputLabel, { color: labelColor }]}>
              Bank Name
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.bankSelector,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}
              onPress={() => setShowBankModal(true)}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.bankSelectorText,
                  { color: bankName ? textColor : labelColor },
                ]}
              >
                {bankName || "Select your bank"}
              </ThemedText>
              <Ionicons
                name="chevron-down"
                size={20}
                color={labelColor}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
          </View>

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
            title="Update Bank Account"
            onPress={updateBankAccount}
            loading={loading}
            disabled={!bankName || !accountNumber || !accountName}
            style={styles.saveButton}
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

          <View style={styles.input}>
            <ThemedText style={[styles.inputLabel, { color: labelColor }]}>
              Bank Name
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.bankSelector,
                { backgroundColor: cardBg, borderColor: borderColor },
              ]}
              onPress={() => setShowBankModal(true)}
              activeOpacity={0.7}
            >
              <ThemedText
                style={[
                  styles.bankSelectorText,
                  { color: bankName ? textColor : labelColor },
                ]}
              >
                {bankName || "Select your bank"}
              </ThemedText>
              <Ionicons
                name="chevron-down"
                size={20}
                color={labelColor}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
          </View>

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
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.card,
                    { backgroundColor: cardBg },
                    // Add visual indicator for interactive cards
                    order.status === "confirmed" && styles.interactiveCard,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Toggle expanded state for orders that can be verified
                    const canVerify = order.status === "confirmed";

                    if (canVerify) {
                      setExpandedOrders((prev) => ({
                        ...prev,
                        [order.id]: !prev[order.id],
                      }));
                    }
                  }}
                >
                  <View style={styles.orderHeader}>
                    <ThemedText
                      style={[styles.orderTitle, { color: textColor }]}
                    >
                      {order.product_name}
                    </ThemedText>
                    {/* Show expand/collapse indicator for verifiable orders */}
                    {order.status === "confirmed" && (
                      <Ionicons
                        name={
                          expandedOrders[order.id]
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color={accent}
                        style={styles.expandIcon}
                      />
                    )}
                    <View style={styles.amountContainer}>
                      <ThemedText
                        style={[styles.orderAmount, { color: accent }]}
                      >
                        ₦{order.amount.toLocaleString()}
                      </ThemedText>
                      <ThemedText
                        style={[styles.sellerPayout, { color: "#34C759" }]}
                      >
                        Payout: ₦{order.seller_payout.toLocaleString()}
                      </ThemedText>
                    </View>
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

                  {(expandedOrders[order.id] ||
                    order.status === "confirmed") && (
                    <View style={styles.verificationSection}>
                      <View style={styles.verificationHeader}>
                        <Ionicons name="key-outline" size={16} color={accent} />
                        <ThemedText
                          style={[
                            styles.verificationLabel,
                            { color: textColor },
                          ]}
                        >
                          Verify Delivery
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.verificationInstructions,
                          { color: labelColor },
                        ]}
                      >
                        Ask the buyer for their verification code to complete
                        this order and receive payment
                      </ThemedText>
                      <Input
                        label="Enter Buyer's Verification Code"
                        value={verificationCodes[order.id] || ""}
                        onChangeText={(code) =>
                          updateVerificationCode(order.id, code)
                        }
                        placeholder="Enter 6-digit code from buyer"
                        keyboardType="numeric"
                        maxLength={6}
                        style={styles.verificationInput}
                      />
                      <Button
                        title={
                          loading && verifyingOrderId === order.id
                            ? "Verifying..."
                            : "Verify Delivery"
                        }
                        onPress={() => verifyOrderCode(order.id)}
                        loading={loading && verifyingOrderId === order.id}
                        disabled={!verificationCodes[order.id] || loading}
                        size="small"
                      />
                    </View>
                  )}

                  {order.status === "completed" && (
                    <View style={styles.completedSection}>
                      <ThemedText
                        style={[styles.completedText, { color: "#34C759" }]}
                      >
                        ✓ Order Completed - Payout Initiated
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
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

        {/* Bank Selection Modal */}
        <Modal
          visible={showBankModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBankModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View
                style={[styles.modalHeader, { borderBottomColor: borderColor }]}
              >
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>
                  Select Your Bank
                </ThemedText>
                <TouchableOpacity
                  onPress={() => {
                    setShowBankModal(false);
                    setBankSearchQuery("");
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={styles.searchContainer}>
                <TouchableOpacity
                  style={[
                    styles.searchInputContainer,
                    {
                      backgroundColor: backgroundColor,
                      borderColor: borderColor,
                    },
                  ]}
                  activeOpacity={1}
                >
                  <Ionicons
                    name="search"
                    size={20}
                    color={labelColor}
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={[styles.searchTextInput, { color: textColor }]}
                    placeholder="Search banks..."
                    placeholderTextColor={labelColor}
                    value={bankSearchQuery}
                    onChangeText={setBankSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {bankSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setBankSearchQuery("")}
                      style={styles.clearButton}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={labelColor}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <FlatList
                data={NIGERIAN_BANKS.filter((bank) =>
                  bank.toLowerCase().includes(bankSearchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item}
                style={styles.bankList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.bankItem,
                      {
                        backgroundColor:
                          bankName === item ? accent + "20" : "transparent",
                        borderBottomColor: borderColor,
                      },
                    ]}
                    onPress={() => {
                      setBankName(item);
                      setShowBankModal(false);
                      setBankSearchQuery("");
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[
                        styles.bankItemText,
                        {
                          color: bankName === item ? accent : textColor,
                          fontWeight:
                            bankName === item
                              ? Typography.weights.semibold
                              : Typography.weights.regular,
                        },
                      ]}
                    >
                      {item}
                    </ThemedText>
                    {bankName === item && (
                      <Ionicons name="checkmark" size={20} color={accent} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
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
  interactiveCard: {
    borderWidth: 1,
    borderColor: "#0A84FF",
    borderStyle: "dashed",
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
  expandIcon: {
    marginLeft: Spacing.sm,
  },
  orderTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    marginRight: Spacing.md,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  orderAmount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  sellerPayout: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
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
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  verificationLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  verificationInstructions: {
    fontSize: Typography.sizes.xs,
    fontStyle: "italic",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  completedSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    alignItems: "center",
  },
  completedText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
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
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xs,
  },
  bankSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 50,
  },
  bankSelectorText: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  chevronIcon: {
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "70%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchTextInput: {
    flex: 1,
    fontSize: Typography.sizes.md,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
  bankList: {
    flex: 1,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  bankItemText: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  verificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  verificationText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  verificationDate: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.xs,
  },
});
