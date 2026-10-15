import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, X } from 'lucide-react';
import { getApiErrorMessage } from '../lib/api';
import { initials } from '../lib/utils';

// ───────────── Dinero ─────────────

export function money(amount: number, opts: { signed?: boolean } = {}): string {
  const abs = Math.abs(amount);
  const text = `Bs ${abs.toLocaleString('es-BO', {
    minimumFractionDigits: abs % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
  if (!opts.signed || amount === 0) return text;
  return amount > 0 ? `+${text}` : `−${text}`;
}

export function Money({
  value,
  dir,
  signed,
  className,
}: {
  value: number;
  /** in = a favor de la agencia, out = la agencia debe. */
  dir?: 'in' | 'out';
  signed?: boolean;
  className?: string;
}) {
  return (
    <span className={`ag-money ${className ?? ''}`} data-dir={dir}>
      {money(value, { signed })}
    </span>
  );
}

export function rate(value: number): string {
  return `${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ───────────── Piezas ─────────────

export function Avatar({
  name,
  src,
  dot,
}: {
  name: string;
  src?: string | null;
  dot?: 'on' | 'off' | 'idle';
}) {
  if (src) {
    return (
      <span className="ag-avatar" data-dot={dot}>
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      </span>
    );
  }
  return (
    <span className="ag-avatar" data-dot={dot} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
}

export function PageHead({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="ag-head">
      <div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {children && <div className="ag-head-actions">{children}</div>}
    </header>
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ag-empty">
      <strong>{title}</strong>
      {children}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="ag-error" role="alert">
      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>{message}</div>
      {onRetry && (
        <button className="ag-btn ag-btn-sm ag-btn-quiet" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="ag-rows" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="ag-row">
          <span className="ag-avatar ag-skel" style={{ borderRadius: '50%' }} />
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="ag-skel" style={{ width: `${55 - i * 6}%` }} />
            <div className="ag-skel" style={{ width: '35%', height: 11 }} />
          </div>
          <div className="ag-skel" style={{ width: 64 }} />
        </li>
      ))}
    </ul>
  );
}

// ───────────── Hoja lateral ─────────────

export function Sheet({
  title,
  intro,
  onClose,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Primero el primer campo del formulario; si no hay, el primer botón.
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLElement>(
        '.ag-sheet-body input:not([type=radio]):not([type=checkbox]), .ag-sheet-body textarea, .ag-sheet-body select',
      ) ?? panel?.querySelector<HTMLElement>('.ag-sheet-body button, .ag-sheet-foot button')
    )?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ag-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ag-sheet" role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="ag-sheet-head">
          <div>
            <h2>{title}</h2>
            {intro && <p>{intro}</p>}
          </div>
          <button className="ag-btn ag-btn-ghost ag-iconbtn" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="ag-sheet-body">{children}</div>
        {footer && <div className="ag-sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ───────────── Toasts ─────────────

type Toast = { id: number; kind: 'ok' | 'error'; text: string };
const ToastContext = createContext<(text: string, kind?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, kind: 'ok' | 'error' = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="ag-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="ag-toast" data-kind={t.kind}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ───────────── Carga de datos ─────────────

/** Carga con estado de error legible y recarga manual. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(getApiErrorMessage(err, 'No pudimos cargar los datos. Revisa tu conexión.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

export function errorText(err: unknown, fallback: string) {
  return getApiErrorMessage(err, fallback);
}
