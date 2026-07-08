import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../lib/api';
import logoSrc from '../assets/logo.png';
import heroSrc from '../assets/hero-image.png';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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

  return (
    <div 
      className="login-container" 
      style={{ backgroundImage: `url(${heroSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="login-overlay"></div>

      <div className="login-form-panel">
        <div className="login-box glass-panel animate-fade-in">
            <div className="login-header">
              <img src={logoSrc} alt="AgencyPanel Logo" className="login-logo-img" />
              <h1>AgencyPanel</h1>
              <p>Gestiona tu agencia de empleo y conecta a tus trabajadores con clientes locales.</p>
            </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Correo Electrónico</label>
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
                type="password"
                className="input-field with-icon"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <span className="forgot-password text-muted">
              ¿Olvidaste tu contraseña? Contacta al administrador de Chamba.
            </span>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? (
              <>
                Ingresando... <Loader2 size={18} className="spin" />
              </>
            ) : (
              <>
                Iniciar Sesión <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Aún no tienes cuenta? <a href="#">Aplica como Agencia</a></p>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Login;
