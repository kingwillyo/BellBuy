import { useState } from "react";

export interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
  onPress?: () => void;
  variant?: "default" | "success" | "warning" | "error";
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "danger" | "warning";
}

export interface ActionOptions {
  title: string;
  options: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
    onPress: () => void;
    variant?: "default" | "danger" | "warning";
    disabled?: boolean;
  }>;
  showCancel?: boolean;
  cancelText?: string;
}

export function useBottomSheet() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const [confirmationOptions, setConfirmationOptions] =
    useState<ConfirmationOptions | null>(null);
  const [actionOptions, setActionOptions] = useState<ActionOptions | null>(
    null
  );

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options);
    setAlertVisible(true);
  };

  const showConfirmation = (options: ConfirmationOptions) => {
    setConfirmationOptions(options);
    setConfirmationVisible(true);
  };

  const showAction = (options: ActionOptions) => {
    setActionOptions(options);
    setActionVisible(true);
  };

  const hideAlert = () => {
    setAlertVisible(false);
    setAlertOptions(null);
  };

  const hideConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationOptions(null);
  };

  const hideAction = () => {
    setActionVisible(false);
    setActionOptions(null);
  };

  return {
    // Alert
    alertVisible,
    alertOptions,
    showAlert,
    hideAlert,

    // Confirmation
    confirmationVisible,
    confirmationOptions,
    showConfirmation,
    hideConfirmation,

    // Action
    actionVisible,
    actionOptions,
    showAction,
    hideAction,
  };
}
