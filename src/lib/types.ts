export interface Agency {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  commissionRate: number;
}

export interface LoginResponse {
  access_token: string;
  agency: Agency;
}

export interface AgencyWorker {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  verificationStatus: 'not_verified' | 'pending' | 'verified';
  isAvailable: boolean;
  isBlocked: boolean;
  averageRating: number;
  completedJobs: number;
  skills: string[];
  activeJobsCount: number;
  latitude: number | null;
  longitude: number | null;
  /** Comisión propia; null = usa la general de la agencia. */
  commissionRate: number | null;
  hasPassword: boolean;
}

export interface ActiveJob {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  priceType: string;
  address: string;
  status: 'searching' | 'negotiating';
  createdAt: string;
  scheduledAt: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  pendingOffersCount: number;
  myOfferStatus: string | null;
}

export interface DashboardStats {
  totalWorkers: number;
  availableWorkers: number;
  offersSentMonth: number;
  offersAcceptedMonth: number;
  revenueMonth: number;
  commissionRate: number;
  commissionMonth: number;
  averageRating: number;
}

export interface AssignedJob {
  requestId: string;
  offerId: string;
  title: string;
  category: string;
  address: string;
  status: string;
  amount: number;
  scheduledAt: string | null;
  workStartedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  offeredAt: string;
  worker: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
  };
  clientName: string;
}

export interface ActivityItem {
  offerId: string;
  offerStatus: string;
  amount: number;
  createdAt: string;
  requestTitle: string;
  requestStatus: string;
  workerName: string;
}

export interface TopWorker {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  averageRating: number;
  completedJobs: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  topWorkers: TopWorker[];
}

export interface FinancialSummary {
  totalRevenue: number;
  commissionRate: number;
  agencyEarnings: number;
  workersPayout: number;
  totalJobsCount: number;
  completedJobsCount: number;
  inProgressJobsCount: number;
  averageTicket: number;
  period: string;
}

export interface WorkerReportItem {
  workerId: string;
  workerName: string;
  profilePhotoUrl: string | null;
  phone: string | null;
  skills: string[];
  averageRating: number;
  completedJobs: number;
  inProgressJobs: number;
  totalJobs: number;
  totalGenerated: number;
  agencyCommission: number;
  workerPayout: number;
  averageJobValue: number;
  jobs: FinancialJobItem[];
}

export interface FinancialJobItem {
  requestId: string;
  offerId: string;
  title: string;
  category: string;
  address: string;
  status: string;
  amount: number;
  commissionRate: number;
  agencyCommission: number;
  workerEarnings: number;
  offeredAt: string;
  completedAt: string | null;
  worker: {
    id: string;
    name: string;
    profilePhotoUrl: string | null;
    phone: string | null;
  };
  clientName: string;
}

export interface AgencyReportsData {
  summary: FinancialSummary;
  workers: WorkerReportItem[];
  jobs: FinancialJobItem[];
}

export interface AgencyDispute {
  id: string;
  requestId: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  requestTitle: string;
  worker: {
    id: string;
    name: string;
  };
  reportedBy: {
    name: string;
    type: string;
  };
}


// ── Operación de la agencia ──

export interface AgencySettings {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  taxId: string | null;
  /** Lo que Chamba cobra a la agencia (lo fija Chamba). */
  chambaCommissionRate: number;
  /** Lo que la agencia se queda de sus trabajadores. */
  workerCommissionRate: number;
}

export interface WorkerCredentials {
  workerId: string;
  email: string;
  phone: string | null;
  password: string;
}

export interface AgencyMessage {
  id: string;
  title: string;
  body: string;
  recipients: number;
  pushed: number;
  createdAt: string;
}

export interface WorkerBalance {
  workerId: string;
  workerName: string;
  profilePhotoUrl: string | null;
  phone: string | null;
  commissionRate: number | null;
  jobsCount: number;
  generated: number;
  agencyCut: number;
  earned: number;
  paid: number;
  /** > 0: la agencia le debe. < 0: el trabajador le debe a la agencia. */
  balance: number;
  lastPaidAt: string | null;
}

export interface PayoutRecord {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  kind: 'paid' | 'kept_cash';
  note: string | null;
  paidAt: string;
}

export interface PayoutsData {
  summary: { owedToWorkers: number; owedByWorkers: number; paidTotal: number };
  workers: WorkerBalance[];
  history: PayoutRecord[];
}

export interface ChambaAccountData {
  summary: {
    /** > 0: Chamba le debe a la agencia. */
    balance: number;
    digitalJobs: number;
    digitalCollected: number;
    digitalFees: number;
    cashJobs: number;
    cashFees: number;
    paidToAgency: number;
    paidToChamba: number;
  };
  jobs: Array<{
    requestId: string;
    title: string;
    workerName: string;
    completedAt: string | null;
    amount: number;
    isDigital: boolean;
    chambaRate: number;
    chambaFee: number;
    effect: number;
  }>;
  settlements: Array<{
    id: string;
    direction: 'to_agency' | 'to_chamba';
    amount: number;
    note: string | null;
    createdAt: string;
  }>;
}
