import React from "react";
import { BottomSheet, BottomSheetOption } from "./BottomSheet";

export interface ActionOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  onPress: () => void;
  variant?: "default" | "danger" | "warning";
  disabled?: boolean;
}

export interface ActionBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: ActionOption[];
  showCancel?: boolean;
  cancelText?: string;
}

export function ActionBottomSheet({
  visible,
  onClose,
  title,
  options,
  showCancel = true,
  cancelText = "Cancel",
}: ActionBottomSheetProps) {
  const bottomSheetOptions: BottomSheetOption[] = [
    ...options.map((option) => ({
      id: option.id,
      title: option.title,
      subtitle: option.subtitle,
      icon: option.icon,
      onPress: option.disabled ? () => {} : option.onPress,
      variant: option.variant || "default",
    })),
    ...(showCancel
      ? [
          {
            id: "cancel",
            title: cancelText,
            subtitle: undefined,
            icon: "close-outline" as const,
            onPress: onClose,
            variant: "default" as const,
          },
        ]
      : []),
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={bottomSheetOptions}
      enablePanDownToClose={true}
      enableBackdropToClose={true}
      showHandle={true}
    />
  );
}
