import React from "react";
import { BottomSheet, BottomSheetOption } from "./BottomSheet";

export interface AlertBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  onPress?: () => void;
  variant?: "default" | "success" | "warning" | "error";
}

export function AlertBottomSheet({
  visible,
  onClose,
  title,
  message,
  buttonText = "OK",
  onPress,
  variant = "default",
}: AlertBottomSheetProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Don't auto-close on press - user needs to tap backdrop or swipe down
  };

  const getIcon = () => {
    switch (variant) {
      case "success":
        return "checkmark-circle-outline";
      case "warning":
        return "warning-outline";
      case "error":
        return "close-circle-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getVariant = () => {
    switch (variant) {
      case "success":
        return "default";
      case "warning":
        return "warning";
      case "error":
        return "danger";
      default:
        return "default";
    }
  };

  const options: BottomSheetOption[] = [
    {
      id: "ok",
      title: message,
      subtitle: undefined,
      icon: getIcon(),
      onPress: handlePress,
      variant: getVariant(),
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
      enablePanDownToClose={true}
      enableBackdropToClose={true}
      showHandle={true}
    />
  );
}
