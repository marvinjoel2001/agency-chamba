import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AGENCY_KEY, TOKEN_KEY } from '../lib/api';
import * as agencyApi from '../lib/agency-api';
import { disconnectRealtime } from '../lib/realtime';
import type { Agency } from '../lib/types';

interface AuthContextValue {
  isAuthenticated: boolean;
  agency: Agency | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredAgency(): Agency | null {
  try {
    const raw = localStorage.getItem(AGENCY_KEY);
    return raw ? (JSON.parse(raw) as Agency) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [agency, setAgency] = useState<Agency | null>(readStoredAgency);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AGENCY_KEY);
    disconnectRealtime();
    setToken(null);
    setAgency(null);
  }, []);

  // El interceptor de axios dispara este evento cuando el backend
  // responde 401 (token vencido o inválido).
  useEffect(() => {
    const onForcedLogout = () => {
      setToken(null);
      setAgency(null);
    };
    window.addEventListener('agency-logout', onForcedLogout);
    return () => window.removeEventListener('agency-logout', onForcedLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await agencyApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    localStorage.setItem(AGENCY_KEY, JSON.stringify(response.agency));
    setToken(response.access_token);
    setAgency(response.agency);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: token !== null,
      agency,
      login,
      logout,
    }),
    [token, agency, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
