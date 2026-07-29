import { api } from './apiClient';
import type { ApiSuccess } from './types';

export type InsightsPayload = {
  inflation_30d: Array<{
    product_id: number;
    product_name: string;
    unit: string;
    market_id: number;
    market_name: string;
    current_avg: number;
    previous_avg: number;
    change_percent: number;
  }>;
  submission_heatmap_30d: Array<{
    date: string;
    count: number;
    approved: number;
    rejected: number;
    pending: number;
  }>;
  top_contributors: Array<{
    id: number;
    name: string;
    points: number;
    avatar: string | null;
    submission_count: number;
    approved_count: number;
  }>;
  community: {
    products_tracked: number;
    submissions_30d: number;
    approved_30d: number;
  };
};

export async function fetchInsights(): Promise<InsightsPayload> {
  const { data } = await api.get<ApiSuccess<InsightsPayload>>('/insights');
  return data.data;
}
