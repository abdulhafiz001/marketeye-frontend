import { api } from './apiClient';
import type { ApiSuccess } from './types';

export type MarketRow = {
  id: number;
  name: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
};

export async function fetchMarkets() {
  const { data } = await api.get<ApiSuccess<{ markets: MarketRow[]; meta: { last_price_update: string | null } }>>(
    '/markets'
  );
  return data.data;
}

export type MarketPriceRow = {
  product: { id: number; name: string; slug: string; unit: string };
  category: { id: number; name: string; slug: string; icon: string | null };
  avg_price: number;
  min_price: number;
  max_price: number;
  submission_count: number;
  snapshot_date: string;
  is_stale: boolean;
  low_confidence: boolean;
  confidence_level: 'high' | 'low' | 'stale';
};

export async function fetchMarketPrices(marketId: number, params?: { category?: string; search?: string }) {
  const { data } = await api.get<
    ApiSuccess<{
      market: {
        id: number;
        name: string;
        area: string | null;
        description: string | null;
        lat: number | null;
        lng: number | null;
      };
      prices: MarketPriceRow[];
    }>
  >(`/markets/${marketId}/prices`, { params });
  return data.data;
}
