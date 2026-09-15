import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ClipboardList,
  MapPin,
  Search,
  RefreshCw,
  X,
  Eye,
  User,
  Calendar,
  DollarSign,
  ExternalLink,
  Phone,
  CheckCircle2,
  Clock,
  BarChart3,
} from 'lucide-react';

import { getAssignedJobs } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, initials, timeAgo } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import type { AssignedJob } from '../lib/types';
import './Workers.css';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  assigned: { label: 'En curso', className: 'active' },
  in_progress: { label: 'Trabajando', className: 'active' },
  completed: { label: 'Completado', className: 'done' },
  cancelled: { label: 'Cancelado', className: 'inactive' },
};

type AssignmentStatusFilter = 'all' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

const Assignments = () => {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [jobs, setJobs] = useState<AssignedJob[] | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');

  // Modal de Detalle de Asignación
  const [selectedJob, setSelectedJob] = useState<AssignedJob | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setError(null);
      setJobs(await getAssignedJobs());
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las asignaciones.'));
    }
  }, []);

  useEffect(() => {
    loadJobs();
    // Refrescar cuando llega un evento realtime (oferta aceptada, estado cambiado)
    const onRealtime = () => loadJobs();
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, [loadJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const filteredJobs = useMemo(() => {
    if (!jobs) return null;
    return jobs.filter((job) => {
      // Filtro de estado
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;

      // Filtro de búsqueda
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.address.toLowerCase().includes(q) ||
        job.clientName.toLowerCase().includes(q) ||
        job.worker.name.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q)
      );
    });
  }, [jobs, statusFilter, search]);

  const commissionRate = agency?.commissionRate ?? 0;

  return (
    <div className="workers-page animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Asignaciones y Trabajos Ganados</h1>
          <p>Supervisa los trabajos adjudicados a tu agencia, su avance e ingresos generados.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
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
        </div>
      </header>


      {/* Controles de Búsqueda y Filtros de Estado */}
      <div className="table-controls">
        <div className="search-bar glass-panel">
          <Search size={18} className="text-muted" />
          <input
            type="text"
            placeholder="Buscar por trabajo, cliente, trabajador o dirección..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="icon-btn" onClick={() => setSearch('')} title="Limpiar">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-chips-wrapper">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos ({jobs?.length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'assigned' ? 'active' : ''}`}
            onClick={() => setStatusFilter('assigned')}
          >
            En curso ({jobs?.filter((j) => j.status === 'assigned').length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            Trabajando ({jobs?.filter((j) => j.status === 'in_progress').length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completados ({jobs?.filter((j) => j.status === 'completed').length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            Cancelados ({jobs?.filter((j) => j.status === 'cancelled').length ?? 0})
          </button>
        </div>
      </div>

      {error && (
        <div className="page-feedback glass-panel animate-fade-in">
          <AlertCircle size={32} color="var(--danger)" />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            Reintentar
          </button>
        </div>
      )}

      {!error && jobs === null && (
        <TableSkeleton rows={5} />
      )}


      {!error && jobs !== null && (
        <div className="glass-panel table-container animate-fade-in">
          <table className="workers-table">
            <thead>
              <tr>
                <th>Trabajo / Categoría</th>
                <th>Trabajador Asignado</th>
                <th>Cliente</th>
                <th>Monto Total</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs?.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-muted empty-row">
                    <ClipboardList size={28} style={{ display: 'block', margin: '0 auto 10px' }} />
                    {jobs.length === 0
                      ? 'Aún no has ganado trabajos. Envía ofertas desde "Explorar Trabajos" para ganar tus primeros contratos.'
                      : 'No se encontraron asignaciones que coincidan con los filtros aplicados.'}
                  </td>
                </tr>
              )}

              {filteredJobs?.map((job) => {
                const status = STATUS_LABELS[job.status] ?? {
                  label: job.status,
                  className: 'inactive',
                };
                return (
                  <tr
                    key={job.offerId}
                    className="worker-table-row"
                    onClick={() => setSelectedJob(job)}
                    title="Clic para ver detalles completos del trabajo"
                  >
                    <td>
                      <div>
                        <p className="fw-600 worker-name-clickable">{job.title}</p>
                        <div className="flex gap-2 items-center" style={{ marginTop: 2 }}>
                          <span className="badge">{job.category}</span>
                          <span className="text-muted fs-small">
                            <MapPin size={11} style={{ verticalAlign: 'middle' }} /> {job.address}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="worker-cell">
                        <div className="worker-avatar-small">
                          {job.worker.profilePhotoUrl ? (
                            <img src={job.worker.profilePhotoUrl} alt={job.worker.name} />
                          ) : (
                            initials(job.worker.name)
                          )}
                        </div>
                        <span className="fw-600 fs-small">{job.worker.name}</span>
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted" />
                        <span className="fs-small">{job.clientName}</span>
                      </div>
                    </td>

                    <td className="fw-600" style={{ color: 'var(--success)' }}>
                      {formatMoney(job.amount)}
                    </td>

                    <td>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </td>

                    <td className="text-muted fs-small">{timeAgo(job.updatedAt)}</td>

                    <td>
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="icon-btn table-action-btn"
                          onClick={() => setSelectedJob(job)}
                          title="Ver detalle completo"
                        >
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Detalle Completo de Asignación */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalles de la Asignación</h3>
              <button className="icon-btn" onClick={() => setSelectedJob(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="worker-detail-body">
              {/* Encabezado del Trabajo */}
              <div className="worker-detail-top">
                <div className="worker-detail-avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'rgba(2, 132, 199, 0.3)' }}>
                  <ClipboardList size={28} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{selectedJob.title}</h4>
                  <div className="flex gap-2 items-center">
                    <span className="badge">{selectedJob.category}</span>
                    <span
                      className={`status-badge ${
                        STATUS_LABELS[selectedJob.status]?.className ?? 'inactive'
                      }`}
                    >
                      {STATUS_LABELS[selectedJob.status]?.label ?? selectedJob.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose Económico */}
              <div className="worker-metrics-grid">
                <div className="metric-box glass-panel">
                  <DollarSign size={18} color="var(--success)" />
                  <strong style={{ color: 'var(--success)' }}>{formatMoney(selectedJob.amount)}</strong>
                  <span>Monto Pactado</span>
                </div>
                <div className="metric-box glass-panel">
                  <span style={{ fontSize: '1.1rem' }}>📈</span>
                  <strong>{commissionRate}%</strong>
                  <span>Comisión Agencia</span>
                </div>
                <div className="metric-box glass-panel">
                  <span style={{ fontSize: '1.1rem' }}>💵</span>
                  <strong style={{ color: 'var(--primary)' }}>
                    {formatMoney(selectedJob.amount * (commissionRate / 100))}
                  </strong>
                  <span>Ganancia Estimada</span>
                </div>
              </div>

              {/* Involucrados: Cliente y Trabajador */}
              <div className="worker-info-section">
                <div className="profile-detail-row">
                  <span className="profile-label">Cliente solicitante:</span>
                  <strong className="profile-value">{selectedJob.clientName}</strong>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-label">Trabajador asignado:</span>
                  <strong className="profile-value">{selectedJob.worker.name}</strong>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-label">Ubicación del trabajo:</span>
                  <span className="profile-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} /> {selectedJob.address}
                  </span>
                </div>
              </div>

              {/* Fechas e Hitos */}
              <div className="worker-skills-section">
                <label className="fs-small text-muted" style={{ display: 'block', marginBottom: 8 }}>
                  <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Cronología del servicio:
                </label>
                <div className="flex flex-col gap-2 fs-small">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted" />
                    <span className="text-muted">Oferta enviada:</span>
                    <span>{new Date(selectedJob.offeredAt).toLocaleString('es-BO')}</span>
                  </div>
                  {selectedJob.scheduledAt && (
                    <div className="flex items-center gap-2">
                      <Calendar size={14} color="var(--primary)" />
                      <span className="text-muted">Programado para:</span>
                      <strong>{new Date(selectedJob.scheduledAt).toLocaleString('es-BO')}</strong>
                    </div>
                  )}
                  {selectedJob.workStartedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} color="var(--accent)" />
                      <span className="text-muted">Trabajo iniciado:</span>
                      <span>{new Date(selectedJob.workStartedAt).toLocaleString('es-BO')}</span>
                    </div>
                  )}
                  {selectedJob.completedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} color="var(--success)" />
                      <span className="text-muted">Trabajo completado:</span>
                      <span>{new Date(selectedJob.completedAt).toLocaleString('es-BO')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción Funcionales */}
              <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedJob.address,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Abrir dirección en Google Maps"
                >
                  <MapPin size={14} />
                  <span>Ver en Maps</span>
                  <ExternalLink size={12} />
                </a>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const workerId = selectedJob.worker.id;
                      setSelectedJob(null);
                      navigate(`/reports?workerId=${workerId}`);
                    }}
                    title="Ver liquidaciones e informe de este trabajador"
                  >
                    <BarChart3 size={14} />
                    <span>Ver en Informes</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedJob(null)}
                  >
                    Cerrar
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, te contacto respecto al trabajo de Chamba "${selectedJob.title}" asignado a ${selectedJob.worker.name}.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ background: '#25D366', borderColor: '#25D366' }}
                  >
                    <Phone size={14} />
                    <span>Contactar</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
