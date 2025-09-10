import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  // Helper to register push token for a given user
  const registerPushToken = async (currentUser: User) => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;
      await supabase
        .from("profiles")
        .update({ expo_push_token: expoPushToken })
        .eq("id", currentUser.id);
    } catch (e) {
      // Ignore errors for now
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        lastUserIdRef.current = session?.user?.id ?? null;
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser) {
        lastUserIdRef.current = nextUser.id;
        await registerPushToken(nextUser);
      } else {
        lastUserIdRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Also register token whenever user changes (covers initial restore and manual switches)
  useEffect(() => {
    if (user) {
      registerPushToken(user);
    }
  }, [user]);

  return { user, isLoading };
}
