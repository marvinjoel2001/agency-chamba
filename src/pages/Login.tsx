import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  X,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Sun,
  Moon,
  Shield,
  Users,
  Calendar,
  TrendingUp,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiErrorMessage } from '../lib/api';
import logoSrc from '../assets/logo.png';
import heroSrc from '../assets/hero-agency.jpg';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals for non-functional links
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión. Verifica tus credenciales.'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('agencia@chamba.com');
    setPassword('agencia123');
    setError(null);
  };

  return (
    <div
      className="chamba-agency-login-root"
      style={{
        backgroundImage: `url(${heroSrc})`,
      }}
    >
      {/* Background cinematic overlay */}
      <div className="login-cinematic-overlay" />

      {/* Theme toggle in top right corner */}
      <button
        type="button"
        className="login-theme-floating-btn icon-btn"
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? (
          <Sun size={18} className="theme-icon sun-icon" />
        ) : (
          <Moon size={18} className="theme-icon moon-icon" />
        )}
      </button>

      {/* Main Two-Column Viewport Wrapper */}
      <div className="login-viewport-container">
        {/* Left Section: Value Proposition & Hero Brand */}
        <section className="login-left-hero">
          {/* Top Brand Logo */}
          <div className="login-brand-header">
            <div className="login-brand-logo-card">
              <img src={logoSrc} alt="Chamba Logo" className="brand-logo-icon" />
            </div>
            <div className="login-brand-text">
              <span className="brand-title">Chamba</span>
              <span className="brand-subtitle">MARKETPLACE BOLIVIA</span>
            </div>
          </div>

          {/* Hero Content Area */}
          <div className="login-hero-body">
            {/* Pill Badge */}
            <div className="hero-pill-badge">
              <Shield size={14} className="badge-shield-icon" />
              <span>Panel de Agencia</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-main-headline">
              Tu equipo de trabajo, <span className="text-gradient-purple">más cerca</span> que nunca.
            </h1>

            {/* Subtitle */}
            <p className="hero-main-subtext">
              Gestiona, coordina y haz crecer tu operación desde un solo lugar.
            </p>

            {/* Feature Pills */}
            <div className="hero-features-row">
              <div className="hero-feature-item">
                <div className="feature-icon-wrapper">
                  <Users size={16} />
                </div>
                <span>Administra tu equipo</span>
              </div>

              <div className="hero-feature-item">
                <div className="feature-icon-wrapper">
                  <Calendar size={16} />
                </div>
                <span>Organiza turnos y horarios</span>
              </div>

              <div className="hero-feature-item">
                <div className="feature-icon-wrapper">
                  <TrendingUp size={16} />
                </div>
                <span>Todo en un solo panel</span>
              </div>
            </div>
          </div>

          {/* Bottom Country Note */}
          <div className="login-hero-footer">
            <span className="bolivia-flag-text">
              🇧🇴 Hecho en Bolivia &nbsp;·&nbsp; Para gente que construye
            </span>
          </div>
        </section>

        {/* Center Section: Floating Glass Login Card */}
        <section className="login-center-card-section">
          <div className="login-glass-card animate-pop-in">
            {/* Card Brand Header */}
            <div className="card-header-center">
              <div className="card-logo-badge">
                <img src={logoSrc} alt="Chamba Logo" className="card-logo-img" />
              </div>
              <h2 className="card-title">Bienvenido de nuevo</h2>
              <p className="card-subtitle">
                Accede a tu panel de agencia de Chamba y sigue haciendo la diferencia.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="card-login-form">
              <div className="card-input-group">
                <label>Correo electrónico</label>
                <div className="card-input-box">
                  <Mail size={16} className="card-input-icon" />
                  <input
                    type="email"
                    className="card-input-field"
                    placeholder="tucorreo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="card-input-group">
                <label>Contraseña</label>
                <div className="card-input-box">
                  <Lock size={16} className="card-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="card-input-field"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="card-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="card-forgot-row">
                  <button
                    type="button"
                    className="card-forgot-btn"
                    onClick={() => setShowForgotModal(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              {error && (
                <div className="card-error-banner animate-fade-in">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="card-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span>Ingresando...</span>
                    <Loader2 size={16} className="spin" />
                  </>
                ) : (
                  <>
                    <span>Iniciar sesión</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </>
                )}
              </button>

              {/* Google Auth / Quick Button */}
              <button
                type="button"
                className="card-google-btn"
                onClick={() => setShowGoogleNotice(true)}
                title="Autenticación institucional"
              >
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Autenticación con Google</span>
              </button>
            </form>

            {/* Quick Demo Helper */}
            <div className="card-demo-chip-container">
              <button
                type="button"
                className="card-demo-chip"
                onClick={handleQuickDemo}
                title="Completar datos de demostración"
              >
                <Sparkles size={12} />
                <span>Rellenar credenciales demo</span>
              </button>
            </div>

            {/* Card Support Footer */}
            <div className="card-footer-support">
              <Bell size={14} className="support-bell-icon" />
              <span>
                ¿Tienes problemas para ingresar?{' '}
                <button
                  type="button"
                  className="support-link-btn"
                  onClick={() => setShowForgotModal(true)}
                >
                  Contacta soporte
                </button>
              </span>
            </div>
          </div>
        </section>

        {/* Right Section: Script Slogan beside Worker */}
        <section className="login-right-slogan-section">
          <div className="login-right-slogan">
            <span>Juntos</span>
            <span>hacemos</span>
            <span className="slogan-accent">más.</span>
          </div>
        </section>
      </div>

      {/* Modal: Google Notice */}
      {showGoogleNotice && (
        <div className="modal-overlay" onClick={() => setShowGoogleNotice(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Shield size={20} color="var(--primary)" />
                <h3>Acceso Institucional de Agencias</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowGoogleNotice(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="modal-hint">
              El acceso de agencias en Chamba está reservado a entidades corporativas con NIT y razón social verificada. Para ingresar utiliza tu correo institucional registrado o completa las credenciales de prueba.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowGoogleNotice(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleQuickDemo();
                  setShowGoogleNotice(false);
                }}
              >
                Usar credenciales demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aplicar como Agencia */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Building2 size={20} color="var(--primary)" />
                <h3>Aplica como Agencia Chamba</h3>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowApplyModal(false)}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-hint">
              Únete a la red empresarial de Chamba. Como agencia podrás vincular a tus propios trabajadores, enviar ofertas en el mapa de empleos y recibir pagos directos con comisiones automatizadas.
            </p>

            <div className="apply-steps-list">
              <div className="apply-step-item">
                <div className="step-num">1</div>
                <div>
                  <strong>Requisitos básicos</strong>
                  <p className="fs-small text-muted">Contar con NIT / Documento fiscal y trabajadores calificados en oficios.</p>
                </div>
              </div>
              <div className="apply-step-item">
                <div className="step-num">2</div>
                <div>
                  <strong>Validación de perfil</strong>
                  <p className="fs-small text-muted">Nuestro equipo revisará los datos de tu empresa en menos de 24 horas hábiles.</p>
                </div>
              </div>
              <div className="apply-step-item">
                <div className="step-num">3</div>
                <div>
                  <strong>Acceso inmediato</strong>
                  <p className="fs-small text-muted">Recibirás tus credenciales maestras para comenzar a operar en este panel.</p>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowApplyModal(false)}
              >
                Cerrar
              </button>
              <a
                href="https://wa.me/59170000000?text=Hola%20equipo%20Chamba,%20deseo%20registrar%20mi%20agencia%20para%20gestionar%20trabajadores."
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <span>Hablar con un asesor</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Recuperar Contraseña / Soporte */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} color="var(--primary)" />
                <h3>Soporte & Recuperación de Acceso</h3>
              </div>
              <button
                className="icon-btn"
                onClick={() => setShowForgotModal(false)}
                title="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-hint">
              Por razones de seguridad financiera y liquidación de cuadrillas, el restablecimiento de credenciales de agencia se gestiona mediante atención prioritaria.
            </p>

            <div className="support-actions-grid" style={{ marginTop: 12 }}>
              <a
                href="https://wa.me/59170000000?text=Hola%20soporte%20Chamba,%20necesito%20ayuda%20para%20ingresar%20al%20panel%20de%20mi%20agencia."
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary support-card-btn"
              >
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <div>
                  <strong>Soporte vía WhatsApp</strong>
                  <span className="fs-small text-muted" style={{ display: 'block' }}>Respuesta en minutos</span>
                </div>
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </a>

              <a
                href="mailto:soporte@chamba.bo?subject=Soporte%20Acceso%20Agencia%20Chamba"
                className="btn btn-secondary support-card-btn"
              >
                <span style={{ fontSize: '1.2rem' }}>✉️</span>
                <div>
                  <strong>soporte@chamba.bo</strong>
                  <span className="fs-small text-muted" style={{ display: 'block' }}>Envíanos un correo oficial</span>
                </div>
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </a>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForgotModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
