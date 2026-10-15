import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Shell from './panel/Shell';
import Home from './panel/pages/Home';
import Jobs from './panel/pages/Jobs';
import Fleet from './panel/pages/Fleet';
import Notices from './panel/pages/Notices';
import Payments from './panel/pages/Payments';
import Reports from './panel/pages/Reports';
import Claims from './panel/pages/Claims';
import Settings from './panel/pages/Settings';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedShell = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Shell /> : <Navigate to="/login" replace />;
};

// Rutas anteriores del panel, para enlaces guardados.
const LEGACY: Array<[string, string]> = [
  ['dashboard', '/inicio'],
  ['workers', '/flota'],
  ['jobs', '/trabajos'],
  ['assignments', '/trabajos?tab=active'],
  ['reports', '/reportes'],
];

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedShell />}>
              <Route index element={<Navigate to="/inicio" replace />} />
              <Route path="inicio" element={<Home />} />
              <Route path="trabajos" element={<Jobs />} />
              <Route path="flota" element={<Fleet />} />
              <Route path="avisos" element={<Notices />} />
              <Route path="reclamos" element={<Claims />} />
              <Route path="pagos" element={<Payments />} />
              <Route path="reportes" element={<Reports />} />
              <Route path="ajustes" element={<Settings />} />
              {LEGACY.map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
