import { api } from './api';
import type {
  ActiveJob,
  Agency,
  AgencyWorker,
  AssignedJob,
  DashboardData,
  LoginResponse,
} from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/agency/auth/login', {
    email,
    password,
  });
  return data;
}

export async function getProfile(): Promise<Agency> {
  const { data } = await api.get<Agency>('/agency/auth/me');
  return data;
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/agency/dashboard');
  return data;
}

export async function getWorkers(search?: string): Promise<AgencyWorker[]> {
  const { data } = await api.get<AgencyWorker[]>('/agency/workers', {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function linkWorker(email: string): Promise<AgencyWorker | null> {
  const { data } = await api.post<AgencyWorker | null>('/agency/workers/link', {
    email,
  });
  return data;
}

export async function unlinkWorker(workerUserId: string): Promise<void> {
  await api.delete(`/agency/workers/${workerUserId}`);
}

export async function getActiveJobs(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}): Promise<ActiveJob[]> {
  const { data } = await api.get<ActiveJob[]>('/agency/jobs/active', { params });
  return data;
}

export async function getAssignedJobs(): Promise<AssignedJob[]> {
  const { data } = await api.get<AssignedJob[]>('/agency/jobs/assigned');
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post('/agency/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

export async function sendOffer(
  requestId: string,
  payload: { workerUserId: string; amount: number; message?: string },
): Promise<unknown> {
  const { data } = await api.post(`/agency/jobs/${requestId}/offer`, payload);
  return data;
}
