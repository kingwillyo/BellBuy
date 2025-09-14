import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
}

export function useAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
  });
  const lastUserIdRef = useRef<string | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to register push token and update last_login for a given user
  const registerPushToken = useCallback(async (currentUser: User) => {
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

      // Update both push token and last_login
      await supabase
        .from("profiles")
        .update({
          expo_push_token: expoPushToken,
          last_login: new Date().toISOString(),
        })
        .eq("id", currentUser.id);
    } catch (e) {
      logger.warn("Failed to register push token", e, { component: "useAuth" });
    }
  }, []);

  // Secure token refresh mechanism
  const refreshToken = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        logger.warn("Token refresh failed", error, { component: "useAuth" });
        return false;
      }

      if (session) {
        setAuthState({
          user: session.user,
          session,
          isLoading: false,
          isAuthenticated: true,
          accessToken: session.access_token,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Token refresh error", error, { component: "useAuth" });
      return false;
    }
  }, []);

  // Setup automatic token refresh
  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Refresh token every 45 minutes (tokens expire in 1 hour)
    tokenRefreshIntervalRef.current = setInterval(
      async () => {
        const refreshed = await refreshToken();
        if (!refreshed) {
          // If refresh fails, clear the interval and sign out
          clearInterval(tokenRefreshIntervalRef.current!);
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            accessToken: null,
          });
        }
      },
      45 * 60 * 1000
    ); // 45 minutes
  }, [refreshToken]);

  // Cleanup token refresh interval
  const cleanupTokenRefresh = useCallback(() => {
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const nextUser = session?.user ?? null;
        setAuthState({
          user: nextUser,
          session,
          isLoading: false,
          isAuthenticated: !!nextUser,
          accessToken: session?.access_token ?? null,
        });
        lastUserIdRef.current = nextUser?.id ?? null;

        if (nextUser) {
          await registerPushToken(nextUser);
          setupTokenRefresh();
        }
      } catch (error) {
        logger.error("Error getting session", error, { component: "useAuth" });
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          accessToken: null,
        });
      }
    };

    getInitialSession();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null;

      setAuthState({
        user: nextUser,
        session,
        isLoading: false,
        isAuthenticated: !!nextUser,
        accessToken: session?.access_token ?? null,
      });

      if (nextUser) {
        lastUserIdRef.current = nextUser.id;
        await registerPushToken(nextUser);
        setupTokenRefresh();
      } else {
        lastUserIdRef.current = null;
        cleanupTokenRefresh();
      }
    });

    return () => {
      subscription.unsubscribe();
      cleanupTokenRefresh();
    };
  }, [router, registerPushToken, setupTokenRefresh, cleanupTokenRefresh]);

  // Also register token whenever user changes (covers initial restore and manual switches)
  useEffect(() => {
    if (authState.user) {
      registerPushToken(authState.user);
    }
  }, [authState.user, registerPushToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTokenRefresh();
    };
  }, [cleanupTokenRefresh]);

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    accessToken: authState.accessToken,
  };
}
