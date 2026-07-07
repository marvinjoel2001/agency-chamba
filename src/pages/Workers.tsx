import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UserPlus,
  Search,
  Loader2,
  AlertCircle,
  Star,
  UserMinus,
  X,
} from 'lucide-react';
import { getWorkers, linkWorker, unlinkWorker } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { fullName, initials } from '../lib/utils';
import type { AgencyWorker } from '../lib/types';
import './Workers.css';

const VERIFICATION_LABELS: Record<string, string> = {
  verified: 'Verificado',
  pending: 'En revisión',
  not_verified: 'Sin verificar',
};

const Workers = () => {
  const [workers, setWorkers] = useState<AgencyWorker[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

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
  }, [loadWorkers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadWorkers(value), 350);
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinking(true);
    try {
      await linkWorker(linkEmail);
      setShowLinkModal(false);
      setLinkEmail('');
      await loadWorkers(search);
    } catch (err) {
      setLinkError(getApiErrorMessage(err, 'No se pudo vincular al trabajador.'));
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (worker: AgencyWorker) => {
    const confirmed = window.confirm(
      `¿Desvincular a ${fullName(worker.firstName, worker.lastName)} de la agencia?`,
    );
    if (!confirmed) return;
    try {
      await unlinkWorker(worker.id);
      await loadWorkers(search);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo desvincular al trabajador.'));
    }
  };

  return (
    <div className="workers-page">
      <header className="page-header">
        <div>
          <h1>Trabajadores</h1>
          <p>Gestiona los trabajadores asociados a tu agencia.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLinkModal(true)}>
          <UserPlus size={18} />
          Añadir Trabajador
        </button>
      </header>

      <div className="table-controls">
        <div className="search-bar glass-panel">
          <Search size={18} className="text-muted" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre, email o especialidad..."
            className="search-input"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="page-feedback glass-panel">
          <AlertCircle size={24} color="var(--danger)" />
          <p>{error}</p>
        </div>
      )}

      {!error && workers === null && (
        <div className="page-feedback glass-panel">
          <Loader2 size={24} className="spin" color="var(--primary)" />
          <p>Cargando trabajadores...</p>
        </div>
      )}

      {!error && workers !== null && (
        <div className="glass-panel table-container">
          <table className="workers-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especialidades</th>
                <th>Estado</th>
                <th>Verificación</th>
                <th>Calificación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted empty-row">
                    No hay trabajadores vinculados todavía. Usa "Añadir Trabajador" con el
                    email de un trabajador registrado en la app.
                  </td>
                </tr>
              )}
              {workers.map((worker) => (
                <tr key={worker.id}>
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
                        <p className="fw-600">{fullName(worker.firstName, worker.lastName)}</p>
                        <span className="text-muted fs-small">{worker.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {worker.skills.length === 0 && <span className="text-muted">—</span>}
                    {worker.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="badge">{skill}</span>
                    ))}
                    {worker.skills.length > 3 && (
                      <span className="text-muted fs-small"> +{worker.skills.length - 3}</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${worker.isAvailable ? 'active' : 'inactive'}`}>
                      {worker.isAvailable ? 'Disponible' : 'No disponible'}
                    </span>
                  </td>
                  <td>
                    <span className="text-muted fs-small">
                      {VERIFICATION_LABELS[worker.verificationStatus] ?? worker.verificationStatus}
                    </span>
                  </td>
                  <td>
                    <span className="rating-cell">
                      <Star size={14} color="var(--warning)" fill="var(--warning)" />
                      {worker.averageRating.toFixed(1)} · {worker.completedJobs} trabajos
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      title="Desvincular de la agencia"
                      onClick={() => handleUnlink(worker)}
                    >
                      <UserMinus size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Añadir Trabajador</h3>
              <button className="icon-btn" onClick={() => setShowLinkModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted fs-small modal-hint">
              Ingresa el email de un trabajador ya registrado en la app móvil de Chamba.
              Al vincularlo dejará de recibir trabajos del mapa P2P y pasará a ser
              gestionado por tu agencia.
            </p>
            <form onSubmit={handleLink}>
              <input
                type="email"
                className="input-field"
                placeholder="trabajador@gmail.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                required
                autoFocus
              />
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
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
