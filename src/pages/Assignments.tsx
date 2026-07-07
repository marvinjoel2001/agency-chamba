import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, ClipboardList, MapPin } from 'lucide-react';
import { getAssignedJobs } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, initials, timeAgo } from '../lib/utils';
import type { AssignedJob } from '../lib/types';
import './Workers.css';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  assigned: { label: 'En curso', className: 'active' },
  in_progress: { label: 'Trabajando', className: 'active' },
  completed: { label: 'Completado', className: 'done' },
  cancelled: { label: 'Cancelado', className: 'inactive' },
};

const Assignments = () => {
  const [jobs, setJobs] = useState<AssignedJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    // Refrescar cuando llega un evento realtime (oferta aceptada, estado cambiado).
    const onRealtime = () => loadJobs();
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, [loadJobs]);

  return (
    <div className="workers-page">
      <header className="page-header">
        <div>
          <h1>Asignaciones</h1>
          <p>Trabajos ganados por tu agencia: en curso e historial.</p>
        </div>
      </header>

      {error && (
        <div className="page-feedback glass-panel">
          <AlertCircle size={24} color="var(--danger)" />
          <p>{error}</p>
        </div>
      )}

      {!error && jobs === null && (
        <div className="page-feedback glass-panel">
          <Loader2 size={24} className="spin" color="var(--primary)" />
          <p>Cargando asignaciones...</p>
        </div>
      )}

      {!error && jobs !== null && (
        <div className="glass-panel table-container">
          <table className="workers-table">
            <thead>
              <tr>
                <th>Trabajo</th>
                <th>Trabajador</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted empty-row">
                    <ClipboardList size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                    Aún no has ganado trabajos. Cuando un cliente acepte una oferta
                    tuya, aparecerá aquí.
                  </td>
                </tr>
              )}
              {jobs.map((job) => {
                const status = STATUS_LABELS[job.status] ?? {
                  label: job.status,
                  className: 'inactive',
                };
                return (
                  <tr key={job.offerId}>
                    <td>
                      <p className="fw-600">{job.title}</p>
                      <span className="text-muted fs-small">
                        <MapPin size={11} style={{ verticalAlign: 'middle' }} /> {job.address}
                      </span>
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
                        <span>{job.worker.name}</span>
                      </div>
                    </td>
                    <td>{job.clientName}</td>
                    <td className="fw-600">{formatMoney(job.amount)}</td>
                    <td>
                      <span className={`status-badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="text-muted fs-small">{timeAgo(job.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Assignments;
