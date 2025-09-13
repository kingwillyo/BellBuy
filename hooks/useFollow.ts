import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ProfileRow {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export function useFollowStatus(followingUserId?: string | null) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const canQuery =
    !!user?.id && !!followingUserId && user?.id !== followingUserId;

  const refresh = useCallback(async () => {
    if (!canQuery) {
      setIsFollowing(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", followingUserId!)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error; // ignore no rows
      setIsFollowing(!!data?.id);
    } finally {
      setLoading(false);
    }
  }, [canQuery, followingUserId, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const follow = useCallback(async () => {
    if (!canQuery) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: user!.id,
        following_id: followingUserId!,
      });
      if (error) throw error;
      setIsFollowing(true);

      // Send social notification
      try {
        await supabase.functions.invoke("social_notify", {
          body: {
            event_type: "follow",
            metadata: {
              follower_id: user!.id,
              following_id: followingUserId!,
            },
          },
        });
      } catch (notifyError) {
        logger.warn("Failed to send follow notification", notifyError, { component: "useFollow" });
        // Don't fail the follow if notification fails
      }
    } finally {
      setLoading(false);
    }
  }, [canQuery, followingUserId, user?.id]);

  const unfollow = useCallback(async () => {
    if (!canQuery) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user!.id)
        .eq("following_id", followingUserId!);
      if (error) throw error;
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  }, [canQuery, followingUserId, user?.id]);

  const toggle = useCallback(async () => {
    if (isFollowing) return unfollow();
    return follow();
  }, [isFollowing, follow, unfollow]);

  return { isFollowing, loading, follow, unfollow, toggle, refresh, canQuery };
}

export function useFollowCounts(userId?: string | null) {
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFollowers(0);
      setFollowing(0);
      return;
    }
    setLoading(true);
    try {
      const [followersResp, followingResp] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", userId),
      ]);
      setFollowers(followersResp.count ?? 0);
      setFollowing(followingResp.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { followers, following, loading, refresh };
}

export function useFollowers(userId?: string | null) {
  const [items, setItems] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      // 1) get follower rows
      const { data: rows, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      if (error) throw error;
      const ids = Array.from(
        new Set((rows ?? []).map((r: any) => r.follower_id).filter(Boolean))
      );
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      // 2) fetch profiles in bulk
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      if (pErr) throw pErr;
      setItems((profiles ?? []) as ProfileRow[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

export function useFollowing(userId?: string | null) {
  const [items, setItems] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      // 1) get following rows
      const { data: rows, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (error) throw error;
      const ids = Array.from(
        new Set((rows ?? []).map((r: any) => r.following_id).filter(Boolean))
      );
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      // 2) fetch profiles in bulk
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      if (pErr) throw pErr;
      setItems((profiles ?? []) as ProfileRow[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
