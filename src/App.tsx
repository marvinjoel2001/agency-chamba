import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import JobsMap from './pages/JobsMap';
import Assignments from './pages/Assignments';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="jobs" element={<JobsMap />} />
            <Route path="assignments" element={<Assignments />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
