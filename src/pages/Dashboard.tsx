import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  TrendingUp,
  Star,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  MapPin,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

import { getDashboard } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, initials, timeAgo, OFFER_STATUS_LABELS } from '../lib/utils';
import { StatSkeleton, CardSkeleton } from '../components/Skeleton';
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    setError(null);
    getDashboard()
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'No se pudo cargar el dashboard.'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // Refrescar cuando llega un evento realtime de ofertas.
    const onRealtime = () => load();
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, []);

  if (error) {
    return (
      <div className="page-feedback glass-panel animate-fade-in">
        <AlertCircle size={38} color="var(--danger)" />
        <h3>Error al cargar el Dashboard</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={load} style={{ marginTop: 12 }}>
          <RefreshCw size={16} />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="dashboard animate-fade-in">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Cargando información operativa y financiera de tu agencia...</p>
          </div>
        </header>
        <StatSkeleton count={4} />
        <div className="dashboard-content" style={{ marginTop: 24 }}>
          <div className="glass-panel" style={{ padding: 20 }}>
            <CardSkeleton count={3} />
          </div>
          <div className="glass-panel" style={{ padding: 20 }}>
            <CardSkeleton count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div className="page-feedback glass-panel animate-fade-in">
        <AlertCircle size={36} color="var(--warning)" />
        <p>Los datos del dashboard no están disponibles en este momento.</p>
        <button className="btn btn-secondary" onClick={load}>
          <RefreshCw size={16} />
          <span>Actualizar</span>
        </button>
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
      link: '/workers',
      hint: 'Gestionar equipo',
    },
    {
      title: 'Ofertas Enviadas (mes)',
      value: String(stats.offersSentMonth),
      icon: Briefcase,
      color: 'var(--accent)',
      trend: `${stats.offersAcceptedMonth} aceptadas`,
      link: '/jobs',
      hint: 'Ver mapa de trabajos',
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
      link: '/reports?period=month',
      hint: 'Ver informe financiero',
    },
    {
      title: 'Calificación Promedio',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'var(--warning)',
      trend: 'de 5.0',
      link: '/workers',
      hint: 'Ver trabajadores',
    },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido de vuelta. Aquí está el resumen operativo de tu agencia.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary" onClick={load} title="Recargar datos">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/reports')}
            title="Ver informes financieros y liquidaciones"
          >
            <BarChart3 size={16} />
            <span>Informes y Finanzas</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
            <MapPin size={16} />
            <span>Explorar y Asignar Trabajos</span>
          </button>
        </div>
      </header>


      {/* Grid de Estadísticas Interactivas */}
      <section className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="stat-card glass-panel interactive"
              onClick={() => navigate(stat.link)}
              title={stat.hint}
            >
              <div
                className="stat-icon"
                style={{
                  backgroundColor: `${stat.color}18`,
                  color: stat.color,
                }}
              >
                <Icon size={22} />
              </div>
              <div className="stat-details">
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
                <span className="stat-hint-text">{stat.hint} →</span>
              </div>
              <div className="stat-trend">
                <span>{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Contenido Principal en 2 Columnas Responsivo */}
      <div className="dashboard-content">
        {/* Actividad Reciente */}
        <section className="recent-activity glass-panel">
          <div className="section-header">
            <div>
              <h2>Actividad Reciente</h2>
              <p className="fs-small text-muted">Últimos movimientos de ofertas enviadas</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/jobs')}
            >
              <span>Explorar Trabajos</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="activity-list">
            {recentActivity.length === 0 && (
              <div className="empty-state-box">
                <Briefcase size={28} color="var(--text-muted)" />
                <p>Aún no hay actividad de ofertas este mes.</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/jobs')}
                >
                  Enviar tu primera oferta
                </button>
              </div>
            )}
            {recentActivity.map((item) => (
              <div
                key={item.offerId}
                className="activity-item"
                onClick={() => navigate('/assignments')}
                title="Ver en asignaciones"
              >
                <div className={`activity-dot ${ACTIVITY_DOT[item.offerStatus] ?? 'primary'}`}></div>
                <div className="activity-text">
                  <p>
                    Oferta de <strong>{item.workerName}</strong> por{' '}
                    <strong>{formatMoney(item.amount)}</strong> en{' '}
                    <strong>{item.requestTitle}</strong> —{' '}
                    <span className="badge">
                      {OFFER_STATUS_LABELS[item.offerStatus] ?? item.offerStatus}
                    </span>
                  </p>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
                <ChevronRight size={16} className="activity-arrow text-muted" />
              </div>
            ))}
          </div>
        </section>

        {/* Mejores Trabajadores */}
        <section className="top-workers glass-panel">
          <div className="section-header">
            <div>
              <h2>Mejores Trabajadores</h2>
              <p className="fs-small text-muted">Destacados por rendimiento</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/workers')}
            >
              <span>Ver todos</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="worker-list">
            {topWorkers.length === 0 && (
              <div className="empty-state-box">
                <Users size={28} color="var(--text-muted)" />
                <p>No hay trabajadores vinculados con calificaciones aún.</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/workers')}
                >
                  <PlusCircle size={14} />
                  <span>Vincular Trabajador</span>
                </button>
              </div>
            )}
            {topWorkers.map((worker) => (
              <div
                key={worker.id}
                className="worker-item"
                onClick={() => navigate('/workers')}
                title="Ver perfil completo en Trabajadores"
              >
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
