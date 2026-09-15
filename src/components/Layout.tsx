import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MapPin,
  LogOut,
  Settings,
  ClipboardList,
  BarChart3,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertCircle,
  KeyRound,
  Sun,
  Moon,
  Menu,
  Shield,
  HelpCircle,
  Eye,
  EyeOff,
  Building2,
  ExternalLink,
} from 'lucide-react';

import logoSrc from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const location = useLocation();
  const { agency, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Navigation indicator state for page transitions
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 320);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile popover state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'password' | 'support'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsOk, setSettingsOk] = useState(false);
  const [saving, setSaving] = useState(false);


  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const pushToast = (kind: Toast['kind'], message: string) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    playNotificationSound();
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 6000);
  };

  // Realtime bridge: connects to worker rooms and dispatches agency-realtime events
  useEffect(() => {
    let cancelled = false;

    getWorkers()
      .then((workers) => {
        if (!cancelled) joinWorkerRooms(workers.map((worker) => worker.id));
      })
      .catch(() => {
        /* sin workers aún */
      });

    const unsubscribe = subscribeAgencyEvents((event, payload) => {
      window.dispatchEvent(
        new CustomEvent('agency-realtime', { detail: { event, payload } }),
      );
      if (event === 'offer.accepted') {
        pushToast('success', '¡Un cliente aceptó una oferta de tu agencia!');
      } else if (event === 'offer.rejected') {
        pushToast('danger', 'El cliente eligió a otro trabajador en una solicitud.');
      } else if (event === 'request.published') {
        pushToast('success', '¡Nuevo trabajo publicado en el mapa! Ve a explorarlo.');
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
    { path: '/reports', label: 'Informes y Finanzas', icon: BarChart3 },
  ];

  return (
    <div className="app-container">
      {/* Top Loading Progress Bar on Route Changes / Data Fetching */}
      {isNavigating && <div className="top-loading-bar" />}

      {/* Background Ambient Glows */}

      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      <div className="bg-glow-3"></div>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-panel ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img src={logoSrc} alt="Chamba Logo" className="logo-img" />
            <div className="logo-text">
              <h2>AgencyPanel</h2>
              <span className="logo-subtext">Chamba Enterprise</span>
            </div>
          </div>
          <button
            className="icon-btn mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            title="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={19} className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-link settings-nav-btn"
            onClick={() => {
              setShowSettings(true);
              setSettingsTab('profile');
              setMobileMenuOpen(false);
            }}
          >
            <Settings size={18} className="nav-icon" />
            <span>Configuración</span>
          </button>
          <button className="nav-link logout-btn" onClick={handleLogout}>
            <LogOut size={18} className="nav-icon" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header glass-panel">
          <div className="header-left">
            <button
              className="icon-btn hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              title="Abrir menú de navegación"
            >
              <Menu size={22} />
            </button>
            <div className="header-info">
              <h3 className="agency-name">{agency?.name ?? 'Mi Agencia'}</h3>
              <span className="badge">
                <Building2 size={12} />
                {agency?.contactEmail ?? 'Agencia Chamba'}
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="icon-btn theme-toggle-btn"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="theme-icon sun-icon" />
              ) : (
                <Moon size={18} className="theme-icon moon-icon" />
              )}
            </button>

            <button
              className="icon-btn header-settings-btn"
              title="Configuración de Agencia"
              onClick={() => {
                setShowSettings(true);
                setSettingsError(null);
                setSettingsOk(false);
              }}
            >
              <Settings size={18} />
            </button>

            {/* Profile Avatar & Dropdown */}
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                className="avatar-btn"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                title="Ver perfil de agencia"
              >
                <div className="avatar">
                  {(agency?.name ?? 'A').charAt(0).toUpperCase()}
                </div>
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown glass-panel animate-pop-in">
                  <div className="profile-dropdown-header">
                    <p className="profile-dropdown-name">{agency?.name ?? 'Agencia'}</p>
                    <p className="profile-dropdown-email">{agency?.contactEmail ?? ''}</p>
                    {agency?.contactPhone && (
                      <p className="profile-dropdown-phone">📞 {agency.contactPhone}</p>
                    )}
                    <div className="profile-dropdown-commission">
                      <span>Comisión de agencia:</span>
                      <strong>{agency?.commissionRate ?? 0}%</strong>
                    </div>
                  </div>
                  <div className="profile-dropdown-divider" />
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/reports');
                    }}
                  >
                    <BarChart3 size={16} />
                    <span>Informes Financieros</span>
                  </button>
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSettings(true);
                      setSettingsTab('profile');
                    }}
                  >
                    <Settings size={16} />
                    <span>Ajustes de Cuenta</span>
                  </button>
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSettings(true);
                      setSettingsTab('support');
                    }}
                  >
                    <HelpCircle size={16} />
                    <span>Soporte Técnico</span>
                  </button>
                  <div className="profile-dropdown-divider" />
                  <button
                    className="profile-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area with Route-based Smooth Animation */}
        <div key={location.pathname} className="content-wrapper page-enter">
          <Outlet />
        </div>
      </main>


      {/* Realtime Floating Toasts */}
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast glass-panel animate-pop-in">
            {toast.kind === 'success' ? (
              <CheckCircle2 size={18} color="var(--success)" />
            ) : (
              <XCircle size={18} color="var(--danger)" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Modal Configuración Completa */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuración de la Agencia</h3>
              <button
                className="icon-btn"
                onClick={() => setShowSettings(false)}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="settings-tabs">
              <button
                className={`settings-tab-btn ${settingsTab === 'profile' ? 'active' : ''}`}
                onClick={() => setSettingsTab('profile')}
              >
                <Building2 size={15} />
                <span>Perfil</span>
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === 'password' ? 'active' : ''}`}
                onClick={() => setSettingsTab('password')}
              >
                <Shield size={15} />
                <span>Seguridad</span>
              </button>
              <button
                className={`settings-tab-btn ${settingsTab === 'support' ? 'active' : ''}`}
                onClick={() => setSettingsTab('support')}
              >
                <HelpCircle size={15} />
                <span>Soporte</span>
              </button>
            </div>

            {/* Tab 1: Perfil de Agencia */}
            {settingsTab === 'profile' && (
              <div className="settings-tab-content animate-fade-in">
                <div className="profile-detail-card glass-panel">
                  <div className="profile-detail-row">
                    <span className="profile-label">Nombre de Agencia:</span>
                    <strong className="profile-value">{agency?.name ?? 'No registrado'}</strong>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-label">Correo de Contacto:</span>
                    <span className="profile-value">{agency?.contactEmail ?? '—'}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-label">Teléfono de Contacto:</span>
                    <span className="profile-value">{agency?.contactPhone ?? 'No configurado'}</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-label">Comisión Pactada:</span>
                    <span className="badge">{agency?.commissionRate ?? 0}%</span>
                  </div>
                  <div className="profile-detail-row">
                    <span className="profile-label">ID de Agencia:</span>
                    <code className="profile-code">{agency?.id ?? '—'}</code>
                  </div>
                </div>
                <p className="fs-small text-muted" style={{ marginTop: 12 }}>
                  * Para modificar los datos de razón social o tasa de comisión, contacta directamente con administración central.
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(false)}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Cambio de Contraseña */}
            {settingsTab === 'password' && (
              <form onSubmit={handleChangePassword} className="animate-fade-in">
                <p className="text-muted fs-small modal-hint">
                  <KeyRound size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Actualiza periódicamente la clave de acceso de <strong>{agency?.name}</strong>.
                </p>

                <div className="input-group">
                  <label>Contraseña actual</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      className="input-field"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Tu clave actual"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      title={showCurrentPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Nueva contraseña (mínimo 6 caracteres)</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      className="input-field"
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Nueva clave segura"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPass(!showNewPass)}
                      title={showNewPass ? 'Ocultar' : 'Mostrar'}
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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
                    Guardar Contraseña
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Soporte Técnico */}
            {settingsTab === 'support' && (
              <div className="settings-tab-content animate-fade-in">
                <p className="modal-hint">
                  ¿Tienes algún problema con las ofertas, pagos de clientes o sincronización de trabajadores? Nuestro equipo de soporte está disponible.
                </p>

                <div className="support-actions-grid">
                  <a
                    href="https://wa.me/59170000000?text=Hola%20soporte%20Chamba,%20necesito%20asistencia%20con%20mi%20agencia"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary support-card-btn"
                  >
                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong>Chat de WhatsApp Oficial</strong>
                      <span className="fs-small text-muted" style={{ display: 'block' }}>Atención directa e inmediata</span>
                    </div>
                    <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                  </a>

                  <a
                    href="mailto:soporte@chamba.bo?subject=Soporte%20Agencia%20Chamba"
                    className="btn btn-secondary support-card-btn"
                  >
                    <span style={{ fontSize: '1.2rem' }}>✉️</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong>soporte@chamba.bo</strong>
                      <span className="fs-small text-muted" style={{ display: 'block' }}>Consultas administrativas y facturación</span>
                    </div>
                    <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                  </a>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSettings(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
