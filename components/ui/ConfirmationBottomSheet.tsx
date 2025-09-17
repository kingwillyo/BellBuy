import React from "react";
import { BottomSheet, BottomSheetOption } from "./BottomSheet";

export interface ConfirmationBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "danger" | "warning";
  loading?: boolean;
}

export function ConfirmationBottomSheet({
  visible,
  onClose,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: ConfirmationBottomSheetProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const options: BottomSheetOption[] = [
    {
      id: "confirm",
      title: confirmText,
      subtitle: loading ? "Please wait..." : undefined,
      icon: variant === "danger" ? "warning-outline" : "checkmark-outline",
      onPress: handleConfirm,
      variant: variant === "danger" ? "danger" : "default",
    },
    {
      id: "cancel",
      title: cancelText,
      subtitle: undefined,
      icon: "close-outline",
      onPress: handleCancel,
      variant: "default",
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
      enablePanDownToClose={!loading}
      enableBackdropToClose={!loading}
      showHandle={true}
    />
  );
}
