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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiErrorMessage } from '../lib/api';
import logoSrc from '../assets/logo.png';
import heroSrc from '../assets/hero-image.png';
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
    setEmail('agencia@chamba.bo');
    setPassword('password123');
    setError(null);
  };

  return (
    <div
      className="login-container"
      style={{
        backgroundImage: `radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 60%), url(${heroSrc})`,
      }}
    >
      <div className="login-overlay"></div>

      {/* Theme toggle in login top corner */}
      <button
        type="button"
        className="login-theme-btn icon-btn"
        title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? (
          <Sun size={18} className="theme-icon sun-icon" />
        ) : (
          <Moon size={18} className="theme-icon moon-icon" />
        )}
      </button>

      <div className="login-form-panel">
        <div className="login-box glass-panel animate-pop-in">
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img src={logoSrc} alt="AgencyPanel Logo" className="login-logo-img" />
            </div>
            <h1>AgencyPanel</h1>
            <p>Conecta a tus trabajadores con clientes locales y gestiona comisiones en tiempo real.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Correo Electrónico de la Agencia</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="input-field with-icon"
                  placeholder="agencia@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field with-icon with-right-btn"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-right-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                type="button"
                className="forgot-password-btn"
                onClick={() => setShowForgotModal(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="login-error animate-fade-in">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? (
                <>
                  <span>Ingresando...</span>
                  <Loader2 size={18} className="spin" />
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={18} className="btn-arrow-icon" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Helper Chip */}
          <div className="demo-helper-wrapper">
            <button
              type="button"
              className="demo-chip-btn"
              onClick={handleQuickDemo}
              title="Llenar con credenciales de prueba para testeo"
            >
              <Sparkles size={13} />
              <span>Autocompletar credenciales de prueba</span>
            </button>
          </div>

          <div className="login-footer">
            <p>
              ¿Aún no tienes cuenta?{' '}
              <button
                type="button"
                className="inline-link-btn"
                onClick={() => setShowApplyModal(true)}
              >
                Aplica como Agencia
              </button>
            </p>
          </div>
        </div>
      </div>

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

      {/* Modal: Recuperar Contraseña */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} color="var(--primary)" />
                <h3>Recuperación de Contraseña</h3>
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
              Por razones de seguridad de fondos y comisiones, el restablecimiento de contraseñas de agencias se realiza mediante validación directa con el equipo central de soporte de Chamba.
            </p>

            <div className="support-actions-grid" style={{ marginTop: 12 }}>
              <a
                href="https://wa.me/59170000000?text=Hola%20soporte%20Chamba,%20olvid%C3%A9%20la%20contrase%C3%B1a%20de%20mi%20agencia.%20Mi%20correo%20es:"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary support-card-btn"
              >
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <div>
                  <strong>Soporte vía WhatsApp</strong>
                  <span className="fs-small text-muted" style={{ display: 'block' }}>Respuesta en pocos minutos</span>
                </div>
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </a>

              <a
                href="mailto:soporte@chamba.bo?subject=Recuperacion%20de%20Contrasena%20Agencia"
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
