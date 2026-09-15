import { api } from './api';
import type {
  ActiveJob,
  Agency,
  AgencyWorker,
  AssignedJob,
  DashboardData,
  LoginResponse,
  AgencyReportsData,
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

export async function getReports(params?: {
  period?: string;
  workerId?: string;
}): Promise<AgencyReportsData> {
  try {
    const { data } = await api.get<AgencyReportsData>('/agency/reports', {
      params,
    });
    return data;
  } catch (err) {
    // Fallback contable local si el endpoint no está disponible
    const [assignedJobs, workers, profile] = await Promise.all([
      getAssignedJobs(),
      getWorkers(),
      getProfile().catch(() => null),
    ]);

    const commissionRate = profile?.commissionRate ?? 15;
    let filteredJobs = assignedJobs;

    if (params?.workerId) {
      filteredJobs = filteredJobs.filter((j) => j.worker.id === params.workerId);
    }

    const mappedJobs = filteredJobs.map((j) => {
      const amount = Number(j.amount);
      const agencyCommission = Number(((amount * commissionRate) / 100).toFixed(2));
      const workerEarnings = Number((amount - agencyCommission).toFixed(2));
      return {
        requestId: j.requestId,
        offerId: j.offerId,
        title: j.title,
        category: j.category,
        address: j.address,
        status: j.status,
        amount,
        commissionRate,
        agencyCommission,
        workerEarnings,
        offeredAt: j.offeredAt,
        completedAt: j.completedAt,
        worker: {
          id: j.worker.id,
          name: j.worker.name,
          profilePhotoUrl: j.worker.profilePhotoUrl,
          phone: null,
        },
        clientName: j.clientName,
      };
    });

    const totalRevenue = Number(mappedJobs.reduce((sum, j) => sum + j.amount, 0).toFixed(2));
    const agencyEarnings = Number(((totalRevenue * commissionRate) / 100).toFixed(2));
    const workersPayout = Number((totalRevenue - agencyEarnings).toFixed(2));
    const completedJobsCount = mappedJobs.filter((j) => j.status === 'completed').length;
    const inProgressJobsCount = mappedJobs.filter(
      (j) => j.status === 'assigned' || j.status === 'in_progress',
    ).length;
    const averageTicket =
      mappedJobs.length > 0 ? Number((totalRevenue / mappedJobs.length).toFixed(2)) : 0;

    const workerMap = new Map<string, any>();
    for (const w of workers) {
      if (!params?.workerId || params.workerId === w.id) {
        workerMap.set(w.id, {
          workerId: w.id,
          workerName: `${w.firstName} ${w.lastName}`.trim(),
          profilePhotoUrl: w.profilePhotoUrl,
          phone: w.phone,
          skills: w.skills,
          averageRating: w.averageRating,
          completedJobs: 0,
          inProgressJobs: 0,
          totalJobs: 0,
          totalGenerated: 0,
          agencyCommission: 0,
          workerPayout: 0,
          averageJobValue: 0,
          jobs: [],
        });
      }
    }

    for (const j of mappedJobs) {
      let ws = workerMap.get(j.worker.id);
      if (!ws) {
        ws = {
          workerId: j.worker.id,
          workerName: j.worker.name,
          profilePhotoUrl: j.worker.profilePhotoUrl,
          phone: null,
          skills: [],
          averageRating: 0,
          completedJobs: 0,
          inProgressJobs: 0,
          totalJobs: 0,
          totalGenerated: 0,
          agencyCommission: 0,
          workerPayout: 0,
          averageJobValue: 0,
          jobs: [],
        };
        workerMap.set(j.worker.id, ws);
      }
      ws.totalJobs += 1;
      ws.totalGenerated = Number((ws.totalGenerated + j.amount).toFixed(2));
      ws.agencyCommission = Number((ws.agencyCommission + j.agencyCommission).toFixed(2));
      ws.workerPayout = Number((ws.workerPayout + j.workerEarnings).toFixed(2));
      if (j.status === 'completed') ws.completedJobs += 1;
      else if (j.status === 'assigned' || j.status === 'in_progress') ws.inProgressJobs += 1;
      ws.jobs.push(j);
    }

    const workersReport = Array.from(workerMap.values()).map((w) => ({
      ...w,
      averageJobValue: w.totalJobs > 0 ? Number((w.totalGenerated / w.totalJobs).toFixed(2)) : 0,
    }));
    workersReport.sort((a, b) => b.totalGenerated - a.totalGenerated);

    return {
      summary: {
        totalRevenue,
        commissionRate,
        agencyEarnings,
        workersPayout,
        totalJobsCount: mappedJobs.length,
        completedJobsCount,
        inProgressJobsCount,
        averageTicket,
        period: params?.period ?? 'all',
      },
      workers: workersReport,
      jobs: mappedJobs,
    };
  }
}

