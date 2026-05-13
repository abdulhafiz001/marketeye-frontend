import { api, persistToken } from './apiClient';
import type { ApiSuccess } from './types';

import type { User } from '@/types';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  points: number;
  verified: boolean;
};

export async function loginRequest(login: string, password: string) {
  const { data } = await api.post<ApiSuccess<{ user: AuthUser; token: string; token_type: string }>>('/auth/login', {
    login,
    password,
  });
  await persistToken(data.data.token);
  return data.data;
}

export async function registerRequest(payload: { name: string; email: string; password: string; phone?: string }) {
  const { data } = await api.post<ApiSuccess<{ user: AuthUser; token: string; token_type: string }>>(
    '/auth/register',
    payload
  );
  await persistToken(data.data.token);
  return data.data;
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout');
  } finally {
    await persistToken(null);
  }
}

export async function meRequest() {
  const { data } = await api.get<ApiSuccess<{ user: AuthUser }>>('/auth/me');
  return data.data.user;
}

export function mapAuthUserToAppUser(u: AuthUser): User {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    avatar: u.avatar || undefined,
    role: u.role,
    points: u.points,
    verified: u.verified,
  };
}
