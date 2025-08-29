import { CreateProductReview, ProductReview } from "@/types/review";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 1) Fetch raw reviews
    const { data: rawReviews, error: reviewsErr } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (reviewsErr) {
      setError(reviewsErr.message);
      setLoading(false);
      return;
    }

    const reviewsData = rawReviews || [];
    const userIds = Array.from(new Set(reviewsData.map((r: any) => r.user_id)));

    // 2) Fetch profiles for those user IDs
    let profilesById: Record<
      string,
      { full_name?: string; avatar_url?: string }
    > = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (profilesErr) {
        setError(profilesErr.message);
      } else {
        profilesById = (profiles || []).reduce(
          (acc: any, p: any) => ({
            ...acc,
            [p.id]: { full_name: p.full_name, avatar_url: p.avatar_url },
          }),
          {}
        );
      }
    }

    setReviews(
      reviewsData.map((r: any) => ({
        ...r,
        user: profilesById[r.user_id] || null,
        images: Array.isArray(r.images) ? r.images : [],
      }))
    );
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId, fetchReviews]);

  const addReview = async (review: CreateProductReview) => {
    setLoading(true);
    setError(null);
    // Ensure user_id is set from the authenticated session
    const { data: authData } = await supabase.auth.getUser();
    const user_id = authData?.user?.id;

    const { data, error } = await supabase
      .from("product_reviews")
      .insert([{ ...review, user_id }])
      .select("*")
      .single();
    if (error) setError(error.message);
    if (data) {
      // Fetch the profile for the single user
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", data.user_id)
        .single();
      setReviews((prev) => [
        {
          ...data,
          user: profile
            ? { full_name: profile.full_name, avatar_url: profile.avatar_url }
            : null,
          images: Array.isArray(data.images) ? data.images : [],
        },
        ...prev,
      ]);
    }
    setLoading(false);
    return { data, error };
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    reviews,
    loading,
    error,
    fetchReviews,
    addReview,
    averageRating,
    totalCount: reviews.length,
  };
}
