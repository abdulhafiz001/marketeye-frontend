import { api } from './apiClient';
import type { ApiSuccess } from './types';
import type { MarketWatchItem } from '@/types';

export async function submitPrice(payload: {
  product_id: number;
  market_id: number;
  price: number;
  quantity_value?: number;
  quantity_unit?: string;
  notes?: string;
}) {
  const { data } = await api.post<
    ApiSuccess<{
      submission: {
        id: number;
        status: string;
        points_awarded: number;
        auto_approved: boolean;
        quantity_value: number;
        quantity_unit: string | null;
        price_per_unit: number;
      };
      user: { points: number };
    }>
  >('/prices/submit', payload);
  return data.data;
}

export async function fetchMySubmissions() {
  const { data } = await api.get<ApiSuccess<{ submissions: any[] }>>('/user/submissions');
  return data.data.submissions;
}

export async function fetchLeaderboard(range: 'week' | 'month' | 'all' = 'all') {
  const { data } = await api.get<
    ApiSuccess<{
      range: string;
      leaderboard: Array<{
        rank: number;
        user: { id: number; name: string; avatar: string | null; points: number };
        submission_count: number;
      }>;
      you: { rank: number; points: number };
    }>
  >('/user/leaderboard', { params: { range } });
  return data.data;
}

function mapWatch(row: any): MarketWatchItem {
  return {
    id: row.id,
    productId: Number(row.product_id),
    productName: row.product_name,
    unit: row.unit,
    marketId: Number(row.market_id),
    marketName: row.market_name,
    lastPrice: row.last_price === null || row.last_price === undefined ? null : Number(row.last_price),
    lastCheckedAt: row.last_checked_at ?? null,
  };
}

export async function fetchMarketWatches() {
  const { data } = await api.get<ApiSuccess<{ watches: any[] }>>('/user/market-watches');
  return data.data.watches.map(mapWatch);
}

export async function saveMarketWatch(payload: {
  productId: number;
  marketId: number;
  lastPrice?: number | null;
}) {
  const { data } = await api.post<ApiSuccess<{ watch: any }>>('/user/market-watches', {
    product_id: payload.productId,
    market_id: payload.marketId,
    last_price: payload.lastPrice,
  });
  return mapWatch(data.data.watch);
}

export async function deleteMarketWatch(productId: number, marketId: number) {
  await api.delete(`/user/market-watches/${productId}/${marketId}`);
}
