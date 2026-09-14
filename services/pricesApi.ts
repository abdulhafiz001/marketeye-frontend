import { api } from './apiClient';
import type { ApiSuccess } from './types';

export type DashboardSummaryPayload = {
  kpis: {
    today_submissions_count: number;
    active_markets_count: number;
    products_tracked_count: number;
    weekly_inflation_rate: number;
    top_price_drop: {
      product_id: number;
      product_name: string;
      unit: string;
      market_id: number;
      market_name: string;
      current_avg: number;
      previous_avg: number;
      change_percent: number;
    } | null;
    top_price_gainer: {
      product_id: number;
      product_name: string;
      unit: string;
      market_id: number;
      market_name: string;
      current_avg: number;
      previous_avg: number;
      change_percent: number;
    } | null;
    top_arbitrage: {
      product_name: string;
      unit: string;
      price_gap: number;
      min_price: number;
      max_price: number;
      percentage_difference: number;
    } | null;
  };
  live_ticker: Array<{
    product_id: number;
    product_name: string;
    unit: string;
    avg_price: number;
    market_name: string;
    change_percent: number;
  }>;
  recent_activity: Array<{
    id: number;
    product_name: string;
    market_name: string;
    price_per_unit: number;
    unit: string;
    is_geoverified: boolean;
    submitted_at: string;
  }>;
};

export type BasketComparePayload = {
  items: Array<{ product_id: number; quantity: number }>;
  latitude?: number | null;
  longitude?: number | null;
};

export type BasketMarketResult = {
  market: {
    id: number;
    name: string;
    area: string;
    latitude: number | null;
    longitude: number | null;
  };
  items_found_count: number;
  total_items_requested: number;
  is_complete: boolean;
  basket_cost: number;
  distance_km: number | null;
  estimated_transit_cost: number;
  total_with_transit: number;
  missing_items: string[];
  breakdown: Array<{
    product_id: number;
    product_name: string;
    unit: string;
    quantity: number;
    unit_price: number | null;
    subtotal: number | null;
    is_available: boolean;
  }>;
};

export type BasketCompareResponse = {
  optimal_market: BasketMarketResult | null;
  potential_savings: number;
  markets: BasketMarketResult[];
};

export async function fetchTrending() {
  const { data } = await api.get<ApiSuccess<{ trending: Array<{ product: any; change_percent: number }> }>>(
    '/prices/trending'
  );
  return data.data.trending;
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryPayload> {
  const { data } = await api.get<ApiSuccess<DashboardSummaryPayload>>('/dashboard/summary');
  return data.data;
}

export async function fetchCompare(productId: number) {
  const { data } = await api.get<
    ApiSuccess<{
      product: { id: number; name: string; unit: string };
      markets: Array<{
        market: { id: number; name: string; area: string | null; lat: number | null; lng: number | null };
        avg_price: number;
        snapshot_date: string;
      }>;
    }>
  >('/prices/compare', { params: { product_id: productId } });
  return data.data;
}

export async function compareBasket(payload: BasketComparePayload): Promise<BasketCompareResponse> {
  const { data } = await api.post<ApiSuccess<BasketCompareResponse>>('/prices/basket-compare', payload);
  return data.data;
}

export type CommunityValidationPayload = {
  product_id: number;
  market_id: number;
  action: 'confirm' | 'dispute';
  reported_price?: number | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type CommunityValidationResponse = {
  action: string;
  is_geoverified: boolean;
  points_earned: number;
  confidence: {
    score: number;
    level: string;
    confirmations_count: number;
    disputes_count: number;
    observations_count: number;
    observed_range: { min: number; max: number; typical: number };
    last_observed_ago: string;
    verdict: string;
    signals: Record<string, any>;
  };
};

export async function validateCommunityPrice(payload: CommunityValidationPayload): Promise<CommunityValidationResponse> {
  const { data } = await api.post<ApiSuccess<CommunityValidationResponse>>('/prices/validate', payload);
  return data.data;
}
