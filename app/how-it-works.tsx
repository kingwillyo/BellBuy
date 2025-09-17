import { Header } from "@/components/Header";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/ui/Button";
import { BorderRadius, Colors, Spacing, Typography } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface StepItemProps {
  number: number;
  title: string;
  description: string;
}

const StepItem: React.FC<StepItemProps> = ({ number, title, description }) => {
  const colors = useColors();

  return (
    <View style={styles.stepContainer}>
      <View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
        <ThemedText style={styles.stepNumberText}>{number}</ThemedText>
      </View>
      <View style={styles.stepContent}>
        <ThemedText type="heading" style={styles.stepTitle}>
          {title}
        </ThemedText>
        <ThemedText
          type="body"
          variant="secondary"
          style={styles.stepDescription}
        >
          {description}
        </ThemedText>
      </View>
    </View>
  );
};

const BuyingSteps = () => {
  const steps = [
    {
      title: "Explore listings",
      description:
        "Browse through a variety of products listed by students in your university. From gadgets to fashion and essentials, everything is just a tap away.",
    },
    {
      title: "Add to cart or wishlist",
      description:
        "Found something you like? Save it to your wishlist for later or add it to your cart to buy immediately.",
    },
    {
      title: "Secure checkout",
      description:
        "Pay safely using our integrated Paystack escrow system. Your money is held securely until you confirm receipt of the item.",
    },
    {
      title: "Choose delivery or pickup",
      description:
        "Select whether you want to meet up for pickup on campus or have us deliver directly to you.",
    },
    {
      title: "Generate verification code",
      description:
        "Once you receive your item and confirm its condition, your app generates a unique verification code for the seller. This code confirms that the transaction is complete.",
    },
  ];

  return (
    <ScrollView
      style={styles.stepsContainer}
      showsVerticalScrollIndicator={false}
    >
      {steps.map((step, index) => (
        <StepItem
          key={index}
          number={index + 1}
          title={step.title}
          description={step.description}
        />
      ))}
    </ScrollView>
  );
};

const SellingSteps = () => {
  const steps = [
    {
      title: "List your item",
      description:
        "Post your product with clear photos, a detailed description, price, and delivery option. Your listing is instantly available to buyers in your university.",
    },
    {
      title: "Connect with buyers",
      description:
        "Interested students in your school will see your item and can add it to their cart or wishlist.",
    },
    {
      title: "Receive order notification",
      description:
        "When a buyer checks out, you’ll be notified immediately to confirm the order. BellBuy holds the payment securely in escrow.",
    },
    {
      title: "Deliver & collect verification code",
      description:
        "Hand over the item to the buyer via pickup or delivery. The buyer provides their unique verification code to confirm receipt.",
    },
    {
      title: "Confirm in payment page",
      description: "Enter the buyer’s verification code on your seller payment page to mark the order as complete. The escrow then releases the payment directly to your bank account. BellBuy only takes a small commission you keep your earnings.",
    },
  ];

  return (
    <ScrollView
      style={styles.stepsContainer}
      showsVerticalScrollIndicator={false}
    >
      {steps.map((step, index) => (
        <StepItem
          key={index}
          number={index + 1}
          title={step.title}
          description={step.description}
        />
      ))}
    </ScrollView>
  );
};

export default function HowItWorksScreen() {
  const [activeTab, setActiveTab] = useState<"buying" | "selling">("buying");
  const colors = useColors();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const handleContinue = () => {
    if (activeTab === "buying") {
      setActiveTab("selling");
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["bottom"]}
      >
        <Header title="How it works" showBackButton />

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable
            style={styles.tab}
            onPress={() => {
              setActiveTab("buying");
              scrollViewRef.current?.scrollTo({ x: 0, animated: true });
            }}
          >
            <ThemedText
              type="heading"
              style={[
                styles.tabText,
                activeTab === "buying" && styles.activeTabText,
              ]}
            >
              Buying
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.tab}
            onPress={() => {
              setActiveTab("selling");
              scrollViewRef.current?.scrollTo({ x: width, animated: true });
            }}
          >
            <ThemedText
              type="heading"
              style={[
                styles.tabText,
                activeTab === "selling" && styles.activeTabText,
              ]}
            >
              Selling
            </ThemedText>
          </Pressable>
        </View>

        {/* Tab Indicator Line */}
        <View style={styles.tabIndicatorContainer}>
          <View
            style={[
              styles.tabIndicator,
              {
                backgroundColor: colors.tint,
                width: width * 0.4,
                marginLeft: activeTab === "buying" ? width * 0.1 : width * 0.5,
              },
            ]}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const pageIndex = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setActiveTab(pageIndex === 0 ? "buying" : "selling");
            }}
            style={styles.horizontalScroll}
          >
            <View style={styles.pageContainer}>
              <BuyingSteps />
            </View>
            <View style={styles.pageContainer}>
              <SellingSteps />
            </View>
          </ScrollView>
        </View>

        {/* Bottom Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={activeTab === "buying" ? "Continue" : "Start shopping"}
            onPress={handleContinue}
            size="large"
            style={styles.continueButton}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  activeTabText: {
    color: "#0A84FF",
  },
  tabIndicatorContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  tabIndicator: {
    height: 3,
    borderRadius: BorderRadius.sm,
  },
  content: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  pageContainer: {
    width: width,
    paddingHorizontal: Spacing.xl,
  },
  stepsContainer: {
    flex: 1,
  },
  stepContainer: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    lineHeight: Typography.sizes.lg * Typography.lineHeights.normal,
  },
  stepDescription: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * Typography.lineHeights.relaxed,
  },
  buttonContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  continueButton: {
    width: "100%",
  },
});

// Helper function to get colors
function useColors() {
  const colorScheme = useThemeColor({}, "background");
  return colorScheme === "#FFFFFF" ? Colors.light : Colors.dark;
}
