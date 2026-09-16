import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getDisputes } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import type { AgencyDispute } from '../lib/types';

interface DisputesModalProps {
  onClose: () => void;
  filterWorkerId?: string | null;
  filterWorkerName?: string | null;
}

export const DisputesModal: React.FC<DisputesModalProps> = ({
  onClose,
  filterWorkerId,
  filterWorkerName,
}) => {
  const [disputes, setDisputes] = useState<AgencyDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los reclamos.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDisputes = disputes.filter((d) => {
    if (filterWorkerId && d.worker.id !== filterWorkerId) return false;
    if (statusFilter === 'open' && d.status !== 'open') return false;
    if (statusFilter === 'resolved' && d.status !== 'resolved') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchReason = d.reason.toLowerCase().includes(q);
      const matchWorker = d.worker.name.toLowerCase().includes(q);
      const matchReporter = d.reportedBy.name.toLowerCase().includes(q);
      const matchTitle = d.requestTitle.toLowerCase().includes(q);
      const matchDesc = (d.description ?? '').toLowerCase().includes(q);
      return matchReason || matchWorker || matchReporter || matchTitle || matchDesc;
    }
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass-panel animate-fade-in"
        style={{ maxWidth: 720, width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 14 }}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={22} color="var(--danger)" />
            <div>
              <h3 style={{ margin: 0 }}>
                {filterWorkerName
                  ? `Reclamos y Disputas: ${filterWorkerName}`
                  : 'Reclamos y Disputas de Trabajadores'}
              </h3>
              <p className="fs-small text-muted" style={{ margin: 0 }}>
                Auditoría de quejas reportadas por clientes sobre tu cuadrilla.
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar glass-panel" style={{ flex: 1, minWidth: 200, padding: '4px 8px' }}>
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Buscar por motivo, cliente, trabajo..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            {search && (
              <button className="icon-btn" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="filter-chips-wrapper" style={{ margin: 0 }}>
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              Todos ({disputes.length})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
              onClick={() => setStatusFilter('open')}
            >
              Abiertos ({disputes.filter((d) => d.status === 'open').length})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('resolved')}
            >
              Resueltos ({disputes.filter((d) => d.status === 'resolved').length})
            </button>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            title="Recargar"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <p className="fs-small">Cargando reportes...</p>
            </div>
          )}

          {error && (
            <div className="page-feedback glass-panel" style={{ padding: 16 }}>
              <AlertTriangle size={24} color="var(--danger)" />
              <p className="fs-small">{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={loadData} style={{ marginTop: 8 }}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && filteredDisputes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
              <h4 style={{ margin: '0 0 6px' }}>Sin reclamos registrados</h4>
              <p className="fs-small">
                {statusFilter !== 'all' || search
                  ? 'No hay reportes que coincidan con los filtros actuales.'
                  : '¡Excelente! No hay quejas activas ni disputas registradas contra tu equipo.'}
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="glass-panel"
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{dispute.reason}</strong>
                      {dispute.status === 'resolved' ? (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--success-light)',
                            color: 'var(--success)',
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CheckCircle size={11} /> Resuelto
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--warning-light)',
                            color: 'var(--warning)',
                            fontSize: '0.72rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Clock size={11} /> Pendiente / En investigación
                        </span>
                      )}
                    </div>
                    <span className="fs-small text-muted" style={{ display: 'block', marginTop: 2 }}>
                      {new Date(dispute.createdAt).toLocaleString('es-BO')}
                    </span>
                  </div>
                </div>

                {dispute.description && (
                  <p
                    className="fs-small"
                    style={{
                      background: 'rgba(0,0,0,0.06)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    "{dispute.description}"
                  </p>
                )}

                {dispute.resolution && (
                  <div
                    className="fs-small"
                    style={{
                      background: 'var(--success-light)',
                      color: 'var(--success)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <strong>Resolución:</strong> {dispute.resolution}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 8,
                  }}
                >
                  <span>
                    <strong>Trabajador:</strong> {dispute.worker.name}
                  </span>
                  <span>
                    <strong>Reportado por:</strong> {dispute.reportedBy.name} ({dispute.reportedBy.type})
                  </span>
                  {dispute.requestTitle && (
                    <span>
                      <strong>Servicio:</strong> {dispute.requestTitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
