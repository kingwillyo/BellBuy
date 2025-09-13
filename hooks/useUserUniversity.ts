import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";

export function useUserUniversity() {
  const { user } = useAuth();
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUniversityId(null);
      setLoading(false);
      return;
    }

    fetchUserUniversity();
  }, [user]);

  const fetchUserUniversity = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("university_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setUniversityId(data?.university_id || null);
    } catch (err: any) {
      console.error("Error fetching user university:", err);
      setError(err.message || "Failed to fetch university");
    } finally {
      setLoading(false);
    }
  };

  return {
    universityId,
    loading,
    error,
    refetch: fetchUserUniversity,
  };
}
