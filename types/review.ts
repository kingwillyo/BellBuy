export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  order_id?: string;
  rating: number;
  review_text?: string;
  images?: string[];
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface CreateProductReview {
  product_id: string;
  order_id: string;
  rating: number;
  review_text?: string;
  images?: string[];
}
