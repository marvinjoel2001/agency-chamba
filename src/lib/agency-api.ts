import { api } from './api';
import type {
  ActiveJob,
  Agency,
  AgencyWorker,
  AssignedJob,
  DashboardData,
  LoginResponse,
  AgencyReportsData,
  AgencyDispute,
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

export async function linkWorker(email: string): Promise<AgencyWorker> {
  const { data } = await api.post<AgencyWorker>('/agency/workers/link', { email });
  return data;
}

export async function toggleWorkerBlock(id: string): Promise<{ blocked: boolean }> {
  const { data } = await api.patch<{ blocked: boolean }>(`/agency/workers/${id}/block`);
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

// Las cifras (comisión, ingresos, pagos) se calculan solo en el backend: si el
// endpoint falla se muestra el error en vez de inventar números en el cliente.
export async function getReports(params?: {
  period?: string;
  workerId?: string;
}): Promise<AgencyReportsData> {
  const { data } = await api.get<AgencyReportsData>('/agency/reports', {
    params,
  });
  return data;
}

export async function getDisputes(): Promise<AgencyDispute[]> {
  const { data } = await api.get<AgencyDispute[]>('/agency/disputes');
  return data;
}
