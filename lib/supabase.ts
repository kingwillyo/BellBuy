import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import "react-native-url-polyfill/auto"; // needed for React Native fetch
import { logger } from "./logger";

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

export const uploadImageToStorage = async (
  uri: string,
  userId: string
): Promise<string> => {
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${ext}`;

  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists || fileInfo.size === 0) {
    throw new Error("Image file not found or is empty");
  }

  const fileData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, Buffer.from(fileData, "base64"), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  if (!publicUrlData?.publicUrl) throw new Error("Failed to get public URL");

  return publicUrlData.publicUrl;
};

export const uploadMultipleImages = async (
  uris: string[],
  userId: string
): Promise<string[]> => {
  const urls: string[] = [];
  for (const uri of uris) {
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
  }
  return urls;
};

export const uploadProfileImageToStorage = async (
  uri: string,
  userId: string
): Promise<string> => {
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const fileName = `${userId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${ext}`;

  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists || fileInfo.size === 0) {
    throw new Error("Image file not found or is empty");
  }

  const fileData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.storage
    .from("profile-images")
    .upload(fileName, Buffer.from(fileData, "base64"), {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from("profile-images")
    .getPublicUrl(fileName);

  if (!publicUrlData?.publicUrl) throw new Error("Failed to get public URL");

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
