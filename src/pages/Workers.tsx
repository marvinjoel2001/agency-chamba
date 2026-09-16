import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Loader2,
  AlertCircle,
  Star,
  UserMinus,
  X,
  Ban,
  Unlock,
  Eye,
  RefreshCw,
  Phone,
  Mail,
  Briefcase,
  Award,
  ExternalLink,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { getWorkers, linkWorker, unlinkWorker, toggleWorkerBlock } from '../lib/agency-api';
import { joinWorkerRooms } from '../lib/realtime';
import { getApiErrorMessage } from '../lib/api';
import { fullName, initials } from '../lib/utils';
import { TableSkeleton } from '../components/Skeleton';
import { DisputesModal } from '../components/DisputesModal';
import type { AgencyWorker } from '../lib/types';
import './Workers.css';


const VERIFICATION_LABELS: Record<string, string> = {
  verified: 'Verificado',
  pending: 'En revisión',
  not_verified: 'Sin verificar',
};

type StatusFilter = 'all' | 'available' | 'unavailable' | 'blocked';

const Workers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<AgencyWorker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Link Worker Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  // Worker Detail Modal ("Ficha del Trabajador")
  const [detailWorker, setDetailWorker] = useState<AgencyWorker | null>(null);

  // Unlink Confirmation Modal
  const [workerToUnlink, setWorkerToUnlink] = useState<AgencyWorker | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  // Disputes Modal
  const [showDisputesModal, setShowDisputesModal] = useState(false);
  const [disputesFilterWorker, setDisputesFilterWorker] = useState<{ id: string; name: string } | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWorkers = useCallback(async (term?: string) => {
    try {
      setError(null);
      const result = await getWorkers(term);
      setWorkers(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los trabajadores.'));
    }
  }, []);

  useEffect(() => {
    loadWorkers();
    // Refrescar en eventos realtime
    const onRealtime = () => loadWorkers(search);
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, [loadWorkers, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadWorkers(value), 350);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkers(search);
    setRefreshing(false);
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinking(true);
    try {
      const linked = await linkWorker(linkEmail);
      if (linked?.id) {
        joinWorkerRooms([linked.id]);
      }
      setShowLinkModal(false);
      setLinkEmail('');
      await loadWorkers(search);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'No se pudo vincular al trabajador.'));
    } finally {
      setLinking(false);
    }
  };

  const confirmUnlink = async () => {
    if (!workerToUnlink) return;
    setUnlinking(true);
    try {
      await unlinkWorker(workerToUnlink.id);
      setWorkerToUnlink(null);
      if (detailWorker?.id === workerToUnlink.id) setDetailWorker(null);
      await loadWorkers(search);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo desvincular al trabajador.'));
    } finally {
      setUnlinking(false);
    }
  };

  const handleToggleBlock = async (worker: AgencyWorker) => {
    try {
      await toggleWorkerBlock(worker.id);
      await loadWorkers(search);
      if (detailWorker?.id === worker.id) {
        setDetailWorker({ ...detailWorker, isBlocked: !detailWorker.isBlocked });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el estado del trabajador.'));
    }
  };

  // Filtered workers based on statusFilter
  const filteredWorkers = useMemo(() => {
    if (!workers) return null;
    return workers.filter((w) => {
      if (statusFilter === 'available') return w.isAvailable && !w.isBlocked;
      if (statusFilter === 'unavailable') return !w.isAvailable && !w.isBlocked;
      if (statusFilter === 'blocked') return w.isBlocked;
      return true;
    });
  }, [workers, statusFilter]);

  return (
    <div className="workers-page animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Trabajadores de la Agencia</h1>
          <p>Gestiona y asigna a tu equipo de profesionales y técnicos.</p>
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
          <button
            className="btn btn-secondary"
            onClick={() => {
              setDisputesFilterWorker(null);
              setShowDisputesModal(true);
            }}
            title="Ver reclamos y reportes de clientes hacia tus trabajadores"
          >
            <ShieldAlert size={16} color="var(--danger)" />
            <span>Reclamos y Disputas</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowLinkModal(true)}>
            <UserPlus size={16} />
            <span>Añadir Trabajador</span>
          </button>
        </div>
      </header>


      {/* Barra de Controles: Búsqueda y Chips de Estado */}
      <div className="table-controls">
        <div className="search-bar glass-panel">
          <Search size={18} className="text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o especialidad..."
            className="search-input"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              className="icon-btn"
              onClick={() => handleSearchChange('')}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros rápidos por estado */}
        <div className="filter-chips-wrapper">
          <button
            className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos ({workers?.length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            Disponibles ({workers?.filter((w) => w.isAvailable && !w.isBlocked).length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'unavailable' ? 'active' : ''}`}
            onClick={() => setStatusFilter('unavailable')}
          >
            En trabajo / No disp. ({workers?.filter((w) => !w.isAvailable && !w.isBlocked).length ?? 0})
          </button>
          <button
            className={`filter-chip ${statusFilter === 'blocked' ? 'active' : ''}`}
            onClick={() => setStatusFilter('blocked')}
          >
            Bloqueados ({workers?.filter((w) => w.isBlocked).length ?? 0})
          </button>
        </div>
      </div>

      {error && (
        <div className="page-feedback glass-panel animate-fade-in">
          <AlertCircle size={32} color="var(--danger)" />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={() => loadWorkers(search)}>
            Reintentar
          </button>
        </div>
      )}

      {!error && workers === null && (
        <TableSkeleton rows={5} />
      )}


      {!error && workers !== null && (
        <div className="glass-panel table-container animate-fade-in">
          <table className="workers-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Especialidades</th>
                <th>Estado</th>
                <th>Verificación</th>
                <th>Calificación</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted empty-row">
                    <AlertCircle size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                    No se encontraron trabajadores con los filtros aplicados.
                  </td>
                </tr>
              )}
              {filteredWorkers?.map((worker) => (
                <tr
                  key={worker.id}
                  className="worker-table-row"
                  onClick={() => setDetailWorker(worker)}
                  title="Clic para ver ficha completa"
                >
                  <td>
                    <div className="worker-cell">
                      <div className="worker-avatar-small">
                        {worker.profilePhotoUrl ? (
                          <img
                            src={worker.profilePhotoUrl}
                            alt={fullName(worker.firstName, worker.lastName)}
                          />
                        ) : (
                          initials(fullName(worker.firstName, worker.lastName))
                        )}
                      </div>
                      <div>
                        <p className="fw-600 worker-name-clickable">
                          {fullName(worker.firstName, worker.lastName)}
                        </p>
                        <span className="text-muted fs-small">{worker.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {worker.skills.length === 0 && <span className="text-muted fs-small">—</span>}
                      {worker.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="badge">
                          {skill}
                        </span>
                      ))}
                      {worker.skills.length > 3 && (
                        <span className="text-muted fs-small">+{worker.skills.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span
                        className={`status-badge ${
                          worker.isBlocked
                            ? 'inactive'
                            : worker.isAvailable
                            ? 'active'
                            : 'inactive'
                        }`}
                      >
                        {worker.isBlocked
                          ? 'Bloqueado'
                          : worker.isAvailable
                          ? 'Disponible'
                          : 'No disponible'}
                      </span>
                      {worker.latitude == null || worker.longitude == null ? (
                        <span
                          className="badge"
                          style={{ fontSize: '0.7rem', opacity: 0.8 }}
                          title="El trabajador no ha reportado GPS reciente desde la app móvil"
                        >
                          Sin GPS
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className="text-muted fs-small">
                      {VERIFICATION_LABELS[worker.verificationStatus] ?? worker.verificationStatus}
                    </span>
                  </td>
                  <td>
                    <span className="rating-cell">
                      <Star size={14} color="var(--warning)" fill="var(--warning)" />
                      {worker.averageRating.toFixed(1)} · {worker.completedJobs} trab.
                    </span>
                  </td>
                  <td>
                    <div
                      className="flex gap-2 justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="icon-btn table-action-btn"
                        title="Ver ficha completa"
                        onClick={() => setDetailWorker(worker)}
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        className="icon-btn table-action-btn"
                        title={worker.isBlocked ? 'Desbloquear trabajador' : 'Bloquear trabajador'}
                        onClick={() => handleToggleBlock(worker)}
                      >
                        {worker.isBlocked ? (
                          <Unlock size={17} color="var(--success)" />
                        ) : (
                          <Ban size={17} color="var(--warning)" />
                        )}
                      </button>
                      <button
                        className="icon-btn table-action-btn danger-hover"
                        title="Desvincular de la agencia"
                        onClick={() => setWorkerToUnlink(worker)}
                      >
                        <UserMinus size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Ficha Detallada del Trabajador */}
      {detailWorker && (
        <div className="modal-overlay" onClick={() => setDetailWorker(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ficha del Trabajador</h3>
              <button className="icon-btn" onClick={() => setDetailWorker(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="worker-detail-body">
              <div className="worker-detail-top">
                <div className="worker-detail-avatar">
                  {detailWorker.profilePhotoUrl ? (
                    <img
                      src={detailWorker.profilePhotoUrl}
                      alt={fullName(detailWorker.firstName, detailWorker.lastName)}
                    />
                  ) : (
                    initials(fullName(detailWorker.firstName, detailWorker.lastName))
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: 4 }}>
                    {fullName(detailWorker.firstName, detailWorker.lastName)}
                  </h4>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`status-badge ${
                        detailWorker.isBlocked
                          ? 'inactive'
                          : detailWorker.isAvailable
                          ? 'active'
                          : 'inactive'
                      }`}
                    >
                      {detailWorker.isBlocked
                        ? 'Bloqueado'
                        : detailWorker.isAvailable
                        ? 'Disponible'
                        : 'No disponible'}
                    </span>
                    <span className="badge">
                      {VERIFICATION_LABELS[detailWorker.verificationStatus] ??
                        detailWorker.verificationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas y Datos del Trabajador */}
              <div className="worker-metrics-grid">
                <div className="metric-box glass-panel">
                  <Star size={18} color="var(--warning)" fill="var(--warning)" />
                  <strong>{detailWorker.averageRating.toFixed(1)}</strong>
                  <span>Calificación</span>
                </div>
                <div className="metric-box glass-panel">
                  <Briefcase size={18} color="var(--primary)" />
                  <strong>{detailWorker.completedJobs}</strong>
                  <span>Trabajos hechos</span>
                </div>
                <div className="metric-box glass-panel">
                  <Award size={18} color="var(--accent)" />
                  <strong>{detailWorker.activeJobsCount}</strong>
                  <span>En curso</span>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="worker-info-section">
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <Mail size={16} className="text-muted" />
                  <span className="fs-small">{detailWorker.email}</span>
                </div>
                {detailWorker.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-muted" />
                    <span className="fs-small">{detailWorker.phone}</span>
                  </div>
                ) : (
                  <p className="fs-small text-muted">Teléfono no registrado.</p>
                )}
              </div>

              {/* Habilidades Completas */}
              <div className="worker-skills-section">
                <label className="fs-small text-muted" style={{ display: 'block', marginBottom: 8 }}>
                  Habilidades & Especialidades declaradas:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {detailWorker.skills.length === 0 && (
                    <span className="text-muted fs-small">Sin habilidades registradas.</span>
                  )}
                  {detailWorker.skills.map((skill) => (
                    <span key={skill} className="badge">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setDetailWorker(null);
                      navigate(`/reports?workerId=${detailWorker.id}`);
                    }}
                    title="Ver informe financiero y liquidaciones de este trabajador"
                  >
                    <BarChart3 size={14} />
                    <span>Informe Financiero</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setDisputesFilterWorker({
                        id: detailWorker.id,
                        name: fullName(detailWorker.firstName, detailWorker.lastName),
                      });
                      setShowDisputesModal(true);
                    }}
                    title="Ver reclamos y reportes de este trabajador"
                  >
                    <ShieldAlert size={14} color="var(--danger)" />
                    <span>Ver Reclamos</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleBlock(detailWorker)}
                  >
                    {detailWorker.isBlocked ? (
                      <>
                        <Unlock size={14} /> Desbloquear
                      </>
                    ) : (
                      <>
                        <Ban size={14} /> Bloquear
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setWorkerToUnlink(detailWorker)}
                  >
                    <UserMinus size={14} /> Desvincular
                  </button>
                </div>


                {detailWorker.phone && (
                  <a
                    href={`https://wa.me/${detailWorker.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(
                      detailWorker.firstName,
                    )},%20te%20contacto%20desde%20la%20agencia.`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ background: '#25D366', borderColor: '#25D366' }}
                  >
                    <span>WhatsApp</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Desvincular Trabajador */}
      {workerToUnlink && (
        <div className="modal-overlay" onClick={() => setWorkerToUnlink(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} color="var(--danger)" />
                <h3>Desvincular Trabajador</h3>
              </div>
              <button className="icon-btn" onClick={() => setWorkerToUnlink(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-hint">
              ¿Estás seguro de desvincular a{' '}
              <strong>{fullName(workerToUnlink.firstName, workerToUnlink.lastName)}</strong>?
              El trabajador volverá al modo independiente y ya no podrás enviar ofertas en su nombre.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setWorkerToUnlink(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmUnlink}
                disabled={unlinking}
              >
                {unlinking ? <Loader2 size={16} className="spin" /> : <UserMinus size={16} />}
                Confirmar Desvinculación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir Trabajador */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Añadir Trabajador a la Agencia</h3>
              <button className="icon-btn" onClick={() => setShowLinkModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted fs-small modal-hint">
              Ingresa el correo del trabajador registrado en la app móvil de Chamba. Al vincularlo,
              tu agencia gestionará sus asignaciones y ofertas en el mapa.
            </p>
            <form onSubmit={handleLink}>
              <div className="input-group">
                <label>Correo electrónico del trabajador</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="trabajador@gmail.com"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {linkError && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  <span>{linkError}</span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLinkModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={linking}>
                  {linking ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                  Vincular a la Agencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reclamos y Disputas */}
      {showDisputesModal && (
        <DisputesModal
          onClose={() => {
            setShowDisputesModal(false);
            setDisputesFilterWorker(null);
          }}
          filterWorkerId={disputesFilterWorker?.id}
          filterWorkerName={disputesFilterWorker?.name}
        />
      )}
    </div>
  );
};

export default Workers;
