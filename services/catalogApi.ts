import { api } from './apiClient';
import type { ApiSuccess } from './types';

export async function fetchCategories() {
  const { data } = await api.get<ApiSuccess<{ categories: Array<{ id: number; name: string; slug: string; icon: string | null; product_count: number }> }>>(
    '/categories'
  );
  return data.data.categories;
}

export async function fetchProducts() {
  const { data } = await api.get<
    ApiSuccess<{
      products: Array<{
        id: number;
        name: string;
        slug: string;
        unit: string;
        category: { id: number; name: string; slug: string; icon: string | null };
      }>;
    }>
  >('/products');
  return data.data.products;
}

export type ProductDetail = {
  product: {
    id: number;
    name: string;
    slug: string;
    unit: string;
    description: string | null;
    image: string | null;
    category: { id: number; name: string; slug: string; icon: string | null };
  };
  stats: {
    average_price: number | null;
    cheapest_market: null | {
      market: { id: number; name: string; area: string | null };
      avg_price: number;
      min_price: number;
      max_price: number;
      snapshot_date: string;
      submission_count: number;
    };
    market_count: number;
    history_market_id?: number | null;
  };
  history: Array<{
    date: string;
    label?: string;
    avg_price: number;
    min_price?: number;
    max_price?: number;
    submission_count?: number;
  }>;
  price_changes?: Array<{
    date: string;
    label: string;
    price: number;
    previous_price: number | null;
    change_amount: number | null;
    change_percent: number | null;
    direction: 'start' | 'up' | 'down';
    note: string;
  }>;
  markets: Array<{
    market: { id: number; name: string; area: string | null };
    avg_price: number;
    min_price: number;
    max_price: number;
    snapshot_date: string;
    as_of?: string;
    submission_count: number;
    confidence_score?: number;
    confidence_level?: 'high' | 'medium' | 'low' | 'needs_review' | 'stale';
    confirmations_count?: number;
    disputes_count?: number;
    observations_count?: number;
    observed_range?: { min: number; max: number; typical: number };
    last_observed_ago?: string;
    verdict?: string;
    user_action?: 'CONFIRM' | 'DISPUTE' | null;
    signals?: {
      recency_score?: number;
      community_score?: number;
      contributor_score?: number;
      geo_score?: number;
      dispersion_score?: number;
      is_geoverified?: boolean;
    };
  }>;
};

export async function fetchProductDetail(productId: number, marketId?: number | null) {
  const { data } = await api.get<ApiSuccess<ProductDetail>>(`/products/${productId}`, {
    params: marketId ? { market_id: marketId } : undefined,
  });
  return data.data;
}
