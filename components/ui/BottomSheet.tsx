import { BorderRadius, Shadows, Spacing, Typography } from "@/constants/Colors";
import { useColors } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import { ThemedText } from "../ThemedText";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface BottomSheetOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "default" | "danger" | "warning";
}

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: BottomSheetOption[];
  snapPoints?: number[]; // Percentage of screen height (0-1)
  enablePanDownToClose?: boolean;
  enableBackdropToClose?: boolean;
  showHandle?: boolean;
  blurType?: "light" | "dark" | "regular";
}

export function BottomSheet({
  visible,
  onClose,
  title,
  options,
  snapPoints = [0.4, 0.7], // Default to 40% and 70% of screen height
  enablePanDownToClose = true,
  enableBackdropToClose = true,
  showHandle = true,
  blurType = "regular",
}: BottomSheetProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panGestureRef = useRef<PanGestureHandler>(null);

  useEffect(() => {
    if (visible) {
      showBottomSheet();
    } else {
      hideBottomSheet();
    }
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible) {
          onClose();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [visible, onClose]);

  const showBottomSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBottomSheet = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePanGesture = (event: any) => {
    const { translationY, velocityY } = event.nativeEvent;

    if (translationY > 0) {
      translateY.setValue(translationY);
    }
  };

  const handlePanEnd = (event: any) => {
    const { translationY, velocityY } = event.nativeEvent;

    if (translationY > SCREEN_HEIGHT * 0.3 || velocityY > 500) {
      // Close the bottom sheet
      onClose();
    } else {
      // Snap back to original position
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const getOptionIconColor = (variant?: string) => {
    switch (variant) {
      case "danger":
        return colors.error;
      case "warning":
        return colors.warning;
      default:
        return colors.tint;
    }
  };

  const getOptionIconBackgroundColor = (variant?: string) => {
    switch (variant) {
      case "danger":
        return `${colors.error}20`;
      case "warning":
        return `${colors.warning}20`;
      default:
        return `${colors.tint}20`;
    }
  };

  const renderOption = (option: BottomSheetOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionItem}
      onPress={() => {
        option.onPress();
        // Don't auto-close - let the option handler decide
      }}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View
          style={[
            styles.optionIconContainer,
            { backgroundColor: getOptionIconBackgroundColor(option.variant) },
          ]}
        >
          <Ionicons
            name={option.icon}
            size={20}
            color={getOptionIconColor(option.variant)}
          />
        </View>
        <View style={styles.optionTextContainer}>
          <ThemedText style={[styles.optionTitle, { color: colors.text }]}>
            {option.title}
          </ThemedText>
          {option.subtitle && (
            <ThemedText
              style={[styles.optionSubtitle, { color: colors.textSecondary }]}
            >
              {option.subtitle}
            </ThemedText>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={20}
              tint={blurType}
              style={StyleSheet.absoluteFillObject}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: colors.overlay },
              ]}
            />
          )}
        </Animated.View>

        {/* Backdrop Touch Handler */}
        {enableBackdropToClose && (
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        )}

        {/* Bottom Sheet */}
        <PanGestureHandler
          ref={panGestureRef}
          onGestureEvent={enablePanDownToClose ? handlePanGesture : undefined}
          onHandlerStateChange={enablePanDownToClose ? handlePanEnd : undefined}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: colors.cardBackground,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Handle */}
            {showHandle && (
              <View
                style={[styles.handle, { backgroundColor: colors.divider }]}
              />
            )}

            {/* Header */}
            <View
              style={[styles.header, { borderBottomColor: colors.divider }]}
            >
              <ThemedText style={[styles.title, { color: colors.text }]}>
                {title}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {options.map(renderOption)}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsContainer: {
    paddingBottom: Spacing.xl,
  },
  optionItem: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.4,
  },
});
