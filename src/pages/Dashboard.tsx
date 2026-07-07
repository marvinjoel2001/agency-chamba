import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, TrendingUp, Star, Loader2, AlertCircle } from 'lucide-react';
import { getDashboard } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, initials, timeAgo, OFFER_STATUS_LABELS } from '../lib/utils';
import type { DashboardData } from '../lib/types';
import './Dashboard.css';

const ACTIVITY_DOT: Record<string, string> = {
  accepted: 'success',
  pending: 'primary',
  declined: 'accent',
  expired: 'accent',
};

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getDashboard()
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(getApiErrorMessage(err, 'No se pudo cargar el dashboard.'));
          }
        });
    };
    load();
    // Refrescar cuando llega un evento realtime de ofertas.
    window.addEventListener('agency-realtime', load);
    return () => {
      cancelled = true;
      window.removeEventListener('agency-realtime', load);
    };
  }, []);

  if (error) {
    return (
      <div className="page-feedback glass-panel">
        <AlertCircle size={32} color="var(--danger)" />
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-feedback glass-panel">
        <Loader2 size={32} className="spin" color="var(--primary)" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const { stats, recentActivity, topWorkers } = data;

  const statCards = [
    {
      title: 'Trabajadores Activos',
      value: `${stats.availableWorkers}/${stats.totalWorkers}`,
      icon: Users,
      color: 'var(--primary)',
      trend: 'disponibles',
    },
    {
      title: 'Ofertas Enviadas (mes)',
      value: String(stats.offersSentMonth),
      icon: Briefcase,
      color: 'var(--accent)',
      trend: `${stats.offersAcceptedMonth} aceptadas`,
    },
    {
      title: 'Ingresos del Mes',
      value: formatMoney(stats.revenueMonth),
      icon: TrendingUp,
      color: 'var(--success)',
      trend:
        stats.commissionRate > 0
          ? `comisión ${formatMoney(stats.commissionMonth)} (${stats.commissionRate}%)`
          : 'completados',
    },
    {
      title: 'Calificación Promedio',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'var(--warning)',
      trend: 'de 5.0',
    },
  ];

  return (
    <div className="dashboard">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido de vuelta. Aquí está el resumen de tu agencia.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
          Asignar Trabajo Manual
        </button>
      </header>

      <section className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card glass-panel">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-details">
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
              </div>
              <div className="stat-trend">
                <span>{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </section>

      <div className="dashboard-content">
        <section className="recent-activity glass-panel">
          <h2>Actividad Reciente</h2>
          <div className="activity-list">
            {recentActivity.length === 0 && (
              <p className="text-muted">
                Aún no hay actividad. Envía tu primera oferta desde "Explorar Trabajos".
              </p>
            )}
            {recentActivity.map((item) => (
              <div key={item.offerId} className="activity-item">
                <div className={`activity-dot ${ACTIVITY_DOT[item.offerStatus] ?? 'primary'}`}></div>
                <div className="activity-text">
                  <p>
                    Oferta de <strong>{item.workerName}</strong> por{' '}
                    <strong>{formatMoney(item.amount)}</strong> en{' '}
                    <strong>{item.requestTitle}</strong> —{' '}
                    {OFFER_STATUS_LABELS[item.offerStatus] ?? item.offerStatus}
                  </p>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="top-workers glass-panel">
          <h2>Mejores Trabajadores</h2>
          <div className="worker-list">
            {topWorkers.length === 0 && (
              <p className="text-muted">Vincula trabajadores para verlos aquí.</p>
            )}
            {topWorkers.map((worker) => (
              <div key={worker.id} className="worker-item">
                <div className="worker-avatar">
                  {worker.profilePhotoUrl ? (
                    <img src={worker.profilePhotoUrl} alt={worker.name} />
                  ) : (
                    initials(worker.name)
                  )}
                </div>
                <div className="worker-info">
                  <h4>{worker.name}</h4>
                  <p>{worker.completedJobs} trabajos completados</p>
                </div>
                <div className="worker-rating">
                  <Star size={14} color="var(--warning)" fill="var(--warning)" />
                  <span>{worker.averageRating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
