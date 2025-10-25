import * as FileSystem from "expo-file-system";
import { logger } from "./logger";

// React Native compatible base64 to hex conversion using built-in functions
const base64ToHex = (base64: string): string => {
  // Use a more compatible approach for React Native
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;

  while (i < base64.length) {
    const encoded1 = chars.indexOf(base64[i++]);
    const encoded2 = chars.indexOf(base64[i++]);
    const encoded3 = chars.indexOf(base64[i++]);
    const encoded4 = chars.indexOf(base64[i++]);

    const bitmap =
      (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    result += ((bitmap >> 16) & 255).toString(16).padStart(2, "0");
    if (encoded3 !== 64)
      result += ((bitmap >> 8) & 255).toString(16).padStart(2, "0");
    if (encoded4 !== 64) result += (bitmap & 255).toString(16).padStart(2, "0");
  }

  return result;
};

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  fileType?: string;
}

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_OPTIONS: Required<ImageValidationOptions> = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  minWidth: 100,
  minHeight: 100,
  maxWidth: 4000,
  maxHeight: 4000,
};

/**
 * Validates image file before upload
 */
export const validateImageFile = async (
  uri: string,
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      return {
        isValid: false,
        error: "Image file not found or is empty",
      };
    }

    // Check file size
    if (fileInfo.size > opts.maxSizeBytes) {
      return {
        isValid: false,
        error: `Image file too large. Maximum size is ${Math.round(
          opts.maxSizeBytes / (1024 * 1024)
        )}MB.`,
        fileSize: fileInfo.size,
      };
    }

    // Validate file type by reading file header
    const fileData = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 100, // Read only first 100 bytes for header check
    });

    const header = base64ToHex(fileData);
    const fileType = getFileTypeFromHeader(header);

    if (!fileType || !opts.allowedTypes.includes(fileType)) {
      return {
        isValid: false,
        error: `Invalid image format. Only ${opts.allowedTypes
          .map((t) => t.split("/")[1].toUpperCase())
          .join(", ")} are allowed.`,
        fileType,
      };
    }

    // Basic dimension validation (if needed)
    // Note: For more accurate dimension checking, you'd need to use a library like expo-image-manipulator
    // or react-native-image-size, but this adds overhead. For now, we'll rely on the file type validation.

    return {
      isValid: true,
      fileSize: fileInfo.size,
      fileType,
    };
  } catch (error) {
    logger.error("Image validation failed", error, {
      component: "ImageValidation",
    });
    return {
      isValid: false,
      error: "Failed to validate image file",
    };
  }
};

/**
 * Get file type from binary header
 */
const getFileTypeFromHeader = (header: string): string | null => {
  // JPEG: FF D8 FF
  if (header.startsWith("ffd8ff")) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (header.startsWith("89504e47")) {
    return "image/png";
  }

  // WebP: 52 49 46 46 (RIFF) followed by WEBP
  if (header.startsWith("52494646") && header.includes("57454250")) {
    return "image/webp";
  }

  // GIF: 47 49 46 38 (GIF8)
  if (header.startsWith("47494638")) {
    return "image/gif";
  }

  return null;
};

/**
 * Sanitize filename to prevent path traversal attacks
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars with underscore
    .replace(/\.{2,}/g, ".") // Replace multiple dots with single dot
    .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
    .substring(0, 255); // Limit length
};

/**
 * Generate secure filename with timestamp and random component
 */
export const generateSecureFilename = (
  userId: string,
  extension: string
): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const sanitizedExt = sanitizeFilename(extension);

  return `${userId}/${timestamp}-${random}.${sanitizedExt}`;
};
