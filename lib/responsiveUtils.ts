import { Dimensions } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Breakpoints for different device types
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
} as const;

// Device type detection
export const getDeviceType = (): "phone" | "tablet" | "desktop" => {
  if (screenWidth >= BREAKPOINTS.desktop) return "desktop";
  if (screenWidth >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
};

// Responsive column calculations
export const getGridColumns = (): number => {
  const deviceType = getDeviceType();

  switch (deviceType) {
    case "desktop":
      return 3; // 3 columns on desktop
    case "tablet":
      return 3; // 3 columns on tablet
    case "phone":
    default:
      return 2; // 2 columns on phone (current behavior)
  }
};

// Responsive item width calculation
export const getItemWidth = (
  padding: number = 16,
  gap: number = 12
): number => {
  const columns = getGridColumns();
  const availableWidth = screenWidth - padding * 2;
  const totalGapWidth = gap * (columns - 1);
  return (availableWidth - totalGapWidth) / columns;
};

// Responsive font size scaling
export const getResponsiveFontSize = (baseSize: number): number => {
  const deviceType = getDeviceType();

  switch (deviceType) {
    case "desktop":
      return baseSize * 1.2;
    case "tablet":
      return baseSize * 1.1;
    case "phone":
    default:
      return baseSize;
  }
};

// Responsive padding scaling
export const getResponsivePadding = (basePadding: number): number => {
  const deviceType = getDeviceType();

  switch (deviceType) {
    case "desktop":
      return basePadding * 1.5;
    case "tablet":
      return basePadding * 1.2;
    case "phone":
    default:
      return basePadding;
  }
};

// Check if device is tablet or larger
export const isTabletOrLarger = (): boolean => {
  return screenWidth >= BREAKPOINTS.tablet;
};

// Check if device is desktop
export const isDesktop = (): boolean => {
  return screenWidth >= BREAKPOINTS.desktop;
};

// Get responsive gap between grid items
export const getResponsiveGap = (): number => {
  const deviceType = getDeviceType();

  switch (deviceType) {
    case "desktop":
      return 12;
    case "tablet":
      return 12;
    case "phone":
    default:
      return 12;
  }
};

// Get responsive horizontal padding
export const getResponsiveHorizontalPadding = (): number => {
  const deviceType = getDeviceType();

  switch (deviceType) {
    case "desktop":
      return 20;
    case "tablet":
      return 18;
    case "phone":
    default:
      return 16;
  }
};
