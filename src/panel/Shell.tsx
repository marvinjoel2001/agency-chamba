import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import logoSrc from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getDisputes, getWorkers } from '../lib/agency-api';
import { joinWorkerRooms, subscribeAgencyEvents } from '../lib/realtime';
import { ToastProvider, useToast } from './ui';
import './panel.css';

const OPERATION = [
  { to: '/inicio', label: 'Inicio', icon: Home },
  { to: '/trabajos', label: 'Trabajos', icon: Briefcase },
  { to: '/flota', label: 'Mi flota', icon: Users },
  { to: '/avisos', label: 'Avisos', icon: Megaphone },
  { to: '/reclamos', label: 'Reclamos', icon: ShieldAlert, badge: 'claims' as const },
];

const MONEY = [
  { to: '/pagos', label: 'Pagos', icon: Wallet },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
];

/** Escucha las ofertas de los trabajadores de la agencia en tiempo real. */
function RealtimeBridge() {
  const toast = useToast();
  useEffect(() => {
    let active = true;
    const joinRooms = () =>
      getWorkers()
        .then((workers) => active && joinWorkerRooms(workers.map((w) => w.id)))
        .catch(() => undefined);
    joinRooms();
    // Mi flota avisa al crear o vincular: sin recargar, ya llegan sus eventos.
    window.addEventListener('agency:workers-changed', joinRooms);
    const off = subscribeAgencyEvents((event, payload) => {
      if (event === 'offer.accepted') {
        toast(`El cliente aceptó tu oferta${payload?.title ? ` para "${payload.title}"` : ''}.`);
      } else if (event === 'offer.rejected') {
        toast('Un cliente rechazó una de tus ofertas.', 'error');
      }
      window.dispatchEvent(new CustomEvent('agency:refresh', { detail: { event } }));
    });
    return () => {
      active = false;
      window.removeEventListener('agency:workers-changed', joinRooms);
      off();
    };
  }, [toast]);
  return null;
}

export default function Shell() {
  const { agency, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openClaims, setOpenClaims] = useState(0);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    getDisputes()
      .then((items) => setOpenClaims(items.filter((d) => !['resolved', 'closed'].includes(d.status)).length))
      .catch(() => undefined);
  }, [location.pathname]);

  const link = (item: (typeof OPERATION)[number] | (typeof MONEY)[number]) => {
    const Icon = item.icon;
    const count = 'badge' in item && item.badge === 'claims' ? openClaims : 0;
    return (
      <NavLink key={item.to} to={item.to} className="ag-navlink">
        <Icon />
        {item.label}
        {count > 0 && (
          <span className="ag-count" aria-label={`${count} abiertos`}>
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="ag">
      <ToastProvider>
        <div className="ag-shell" data-menu={menuOpen ? 'open' : 'closed'}>
          <nav className="ag-rail" aria-label="Menú principal">
            <div className="ag-brand">
              <img src={logoSrc} alt="" />
              <div>
                <strong>{agency?.name ?? 'Tu agencia'}</strong>
                <span>Chamba Agencias</span>
              </div>
            </div>

            <div className="ag-navgroup">Operación</div>
            {OPERATION.map(link)}
            <div className="ag-navgroup">Dinero</div>
            {MONEY.map(link)}

            <div className="ag-rail-foot">
              <NavLink to="/ajustes" className="ag-navlink">
                <Settings />
                Ajustes
              </NavLink>
              <button className="ag-navlink ag-row-button" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun /> : <Moon />}
                {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              </button>
              <button className="ag-navlink ag-row-button" onClick={logout}>
                <LogOut />
                Cerrar sesión
              </button>
            </div>
          </nav>

          {menuOpen && (
            <div
              className="ag-scrim"
              style={{ zIndex: 65, justifyContent: 'flex-start' }}
              onClick={() => setMenuOpen(false)}
            />
          )}

          <div style={{ minWidth: 0 }}>
            <header className="ag-topbar">
              <button
                className="ag-btn ag-btn-ghost ag-iconbtn"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu />
              </button>
              <strong>{agency?.name ?? 'Chamba Agencias'}</strong>
            </header>
            <main className="ag-main">
              <Outlet />
            </main>
          </div>
        </div>
        <RealtimeBridge />
      </ToastProvider>
    </div>
  );
}
