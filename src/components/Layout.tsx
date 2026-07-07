import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  LogOut,
  Settings,
  ClipboardList,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWorkers, changePassword } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { joinWorkerRooms, subscribeAgencyEvents } from '../lib/realtime';
import './Layout.css';

interface Toast {
  id: number;
  kind: 'success' | 'danger';
  message: string;
}

let toastSeq = 0;

const Layout = () => {
  const navigate = useNavigate();
  const { agency, logout } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsOk, setSettingsOk] = useState(false);
  const [saving, setSaving] = useState(false);

  const pushToast = (kind: Toast['kind'], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 6000);
  };

  // Puente realtime: el panel se une a las salas de sus workers y avisa a las
  // páginas (via CustomEvent) para que refresquen sus datos.
  useEffect(() => {
    let cancelled = false;

    getWorkers()
      .then((workers) => {
        if (!cancelled) joinWorkerRooms(workers.map((worker) => worker.id));
      })
      .catch(() => {
        /* sin workers aún; las salas se unen al recargar */
      });

    const unsubscribe = subscribeAgencyEvents((event, payload) => {
      window.dispatchEvent(
        new CustomEvent('agency-realtime', { detail: { event, payload } }),
      );
      if (event === 'offer.accepted') {
        pushToast('success', '¡Un cliente aceptó una oferta de tu agencia!');
      } else if (event === 'offer.rejected') {
        pushToast('danger', 'El cliente eligió a otro trabajador en una solicitud.');
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsOk(false);
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSettingsOk(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setSettingsError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/workers', label: 'Trabajadores', icon: Users },
    { path: '/jobs', label: 'Explorar Trabajos', icon: MapPin },
    { path: '/assignments', label: 'Asignaciones', icon: ClipboardList },
  ];

  return (
    <div className="app-container">
      {/* Background Decorators */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">C</div>
            <h2>AgencyPanel</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link logout-btn" onClick={handleLogout}>
            <LogOut size={20} className="nav-icon" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header glass-panel">
          <div className="header-info">
            <h3 className="agency-name">{agency?.name ?? 'Mi Agencia'}</h3>
            <span className="badge">{agency?.contactEmail ?? ''}</span>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              title="Configuración"
              onClick={() => {
                setShowSettings(true);
                setSettingsError(null);
                setSettingsOk(false);
              }}
            >
              <Settings size={20} />
            </button>
            <div className="avatar">{(agency?.name ?? 'A').charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="content-wrapper animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Toasts realtime */}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast glass-panel animate-fade-in">
            {toast.kind === 'success' ? (
              <CheckCircle2 size={18} color="var(--success)" />
            ) : (
              <XCircle size={18} color="var(--danger)" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Modal Configuración */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuración</h3>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted fs-small modal-hint">
              <KeyRound size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Cambiar la contraseña de acceso de <strong>{agency?.name}</strong>.
            </p>
            <form onSubmit={handleChangePassword}>
              <div className="input-group">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  className="input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Nueva contraseña (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  className="input-field"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              {settingsError && (
                <div className="login-error">
                  <AlertCircle size={16} />
                  <span>{settingsError}</span>
                </div>
              )}
              {settingsOk && (
                <div className="success-toast" style={{ marginBottom: 0 }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Contraseña actualizada correctamente.</span>
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSettings(false)}
                >
                  Cerrar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
