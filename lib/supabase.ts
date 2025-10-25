import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import "react-native-url-polyfill/auto"; // needed for React Native fetch
import {
  generateSecureFilename,
  sanitizeFilename,
  validateImageFile,
} from "./imageValidation";
import { logger } from "./logger";

// React Native compatible base64 to Uint8Array conversion
const base64ToUint8Array = (base64: string): Uint8Array => {
  // Use a more compatible approach for React Native
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  let i = 0;

  while (i < base64.length) {
    const encoded1 = chars.indexOf(base64[i++]);
    const encoded2 = chars.indexOf(base64[i++]);
    const encoded3 = chars.indexOf(base64[i++]);
    const encoded4 = chars.indexOf(base64[i++]);

    const bitmap =
      (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;

    bytes.push((bitmap >> 16) & 255);
    if (encoded3 !== 64) bytes.push((bitmap >> 8) & 255);
    if (encoded4 !== 64) bytes.push(bitmap & 255);
  }

  return new Uint8Array(bytes);
};

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate that environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    `Missing Supabase environment variables. Please create a .env file with:
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

See ENVIRONMENT_SETUP.md for detailed instructions.`
  );
}

// Client-side Supabase client (for React Native app)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
      // Set a longer timeout for all requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
});

// Note: Server-side operations should be handled via Supabase Edge Functions
// with proper authentication instead of exposing service role keys client-side

// Secure database operations with user context
export class SecureSupabase {
  private accessToken: string;
  private user: any = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async initialize() {
    if (!this.accessToken) {
      throw new Error("Access token required");
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(this.accessToken);
    if (error || !user) {
      throw new Error("Invalid access token");
    }
    this.user = user;
  }

  getClient() {
    if (!this.user) {
      throw new Error("Not initialized. Call initialize() first.");
    }
    return supabase;
  }

  getUserId() {
    if (!this.user) {
      throw new Error("Not initialized. Call initialize() first.");
    }
    return this.user.id;
  }

  // Secure query methods that automatically apply user context
  async secureQuery<T>(
    operation: (client: typeof supabase) => Promise<T>
  ): Promise<T> {
    if (!this.user) {
      throw new Error("Not initialized. Call initialize() first.");
    }
    return operation(supabase);
  }
}

export const uploadImageToStorage = async (
  uri: string,
  userId: string
): Promise<string> => {
  // Validate image file before upload
  const validation = await validateImageFile(uri);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid image file");
  }

  // Generate secure filename
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const fileName = generateSecureFilename(userId, ext);

  // Read file data
  const fileData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, base64ToUint8Array(fileData), {
      contentType: validation.fileType || "image/jpeg",
      upsert: false,
    });

  if (error) {
    logger.error("Image upload failed", error, {
      component: "Supabase",
      userId,
      fileName,
    });
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Failed to get public URL");
  }

  logger.info("Image uploaded successfully", {
    component: "Supabase",
    userId,
    fileName,
    fileSize: validation.fileSize,
  });

  return publicUrlData.publicUrl;
};

export const uploadMultipleImages = async (
  uris: string[],
  userId: string
): Promise<string[]> => {
  const urls: string[] = [];

  for (const uri of uris) {
    try {
      // Validate each image before processing
      const validation = await validateImageFile(uri);
      if (!validation.isValid) {
        logger.warn("Skipping invalid image", {
          component: "Supabase",
          error: validation.error,
          uri: uri.substring(0, 50) + "...", // Log partial URI for debugging
        });
        continue;
      }

      // Compress image before upload
      let compressedUri = uri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        compressedUri = manipResult.uri;
      } catch (e) {
        // If compression fails, fallback to original uri
        logger.warn("Image compression failed, using original", e, {
          component: "Supabase",
        });
      }

      const url = await uploadImageToStorage(compressedUri, userId);
      urls.push(url);
    } catch (error) {
      logger.error("Failed to upload image in batch", error, {
        component: "Supabase",
        userId,
        uri: uri.substring(0, 50) + "...",
      });
      // Continue with other images instead of failing the entire batch
    }
  }

  return urls;
};

export const uploadProfileImageToStorage = async (
  uri: string,
  userId: string
): Promise<string> => {
  // Validate image file before upload
  const validation = await validateImageFile(uri, {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB for profile images
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid profile image file");
  }

  // Generate secure filename
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const fileName = generateSecureFilename(userId, ext);

  // Read file data
  const fileData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("profile-images")
    .upload(fileName, base64ToUint8Array(fileData), {
      contentType: validation.fileType || "image/jpeg",
      upsert: false,
    });

  if (error) {
    logger.error("Profile image upload failed", error, {
      component: "Supabase",
      userId,
      fileName,
    });
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("profile-images")
    .getPublicUrl(fileName);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Failed to get public URL");
  }

  logger.info("Profile image uploaded successfully", {
    component: "Supabase",
    userId,
    fileName,
    fileSize: validation.fileSize,
  });

  return publicUrlData.publicUrl;
};

// Engagement tracking functions
export const trackProductView = async (productId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc("increment_product_view_count", {
      product_id: productId,
    });

    if (error) {
      console.error("Error tracking product view:", error);
    }
  } catch (error) {
    console.error("Error tracking product view:", error);
  }
};

export const trackProductWishlistAdd = async (
  productId: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc("increment_product_wishlist_count", {
      product_id: productId,
    });

    if (error) {
      console.error("Error tracking wishlist add:", error);
    }
  } catch (error) {
    console.error("Error tracking wishlist add:", error);
  }
};

export const trackProductWishlistRemove = async (
  productId: string
): Promise<void> => {
  try {
    const { error } = await supabase.rpc("decrement_product_wishlist_count", {
      product_id: productId,
    });

    if (error) {
      console.error("Error tracking wishlist remove:", error);
    }
  } catch (error) {
    console.error("Error tracking wishlist remove:", error);
  }
};
