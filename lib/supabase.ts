import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import "react-native-url-polyfill/auto"; // needed for React Native fetch

const SUPABASE_URL = "https://pdehjhhuceqmltpvosfh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZWhqaGh1Y2VxbWx0cHZvc2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NDAyOTUsImV4cCI6MjA2NzAxNjI5NX0.SO2BTtiCbvWCtU3n_s3hQVAS2Ai76MAXE1d_PdBZSsA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
      console.warn("Image compression failed, uploading original:", e);
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
