import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, KeyRound, Link2, MessageSquare, Percent, Search, UserPlus } from 'lucide-react';
import {
  createWorker,
  getSettings,
  getWorkers,
  linkWorker,
  resetWorkerPassword,
  setWorkerCommission,
  toggleWorkerBlock,
  unlinkWorker,
} from '../../lib/agency-api';
import type { AgencyWorker, WorkerCredentials } from '../../lib/types';
import { fullName } from '../../lib/utils';
import {
  Avatar,
  Empty,
  ErrorNote,
  PageHead,
  Sheet,
  SkeletonRows,
  errorText,
  rate,
  useLoad,
  useToast,
} from '../ui';

type Panel =
  | { kind: 'create' }
  | { kind: 'link' }
  | { kind: 'password'; worker: AgencyWorker }
  | { kind: 'commission'; worker: AgencyWorker }
  | { kind: 'manage'; worker: AgencyWorker };

export default function Fleet() {
  const workers = useLoad(() => getWorkers());
  const settings = useLoad(() => getSettings());
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  const navigate = useNavigate();

  const generalRate = settings.data?.workerCommissionRate ?? 0;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = workers.data ?? [];
    if (!q) return all;
    return all.filter((w) =>
      [w.firstName, w.lastName, w.email, w.phone ?? '', ...w.skills].join(' ').toLowerCase().includes(q),
    );
  }, [workers.data, query]);

  const all = workers.data ?? [];
  const busy = all.filter((w) => w.activeJobsCount > 0).length;
  const available = all.filter((w) => w.isAvailable && !w.isBlocked).length;

  const close = () => setPanel(null);
  const refresh = () => workers.reload(true);

  return (
    <>
      <PageHead
        title="Mi flota"
        intro="Tus trabajadores solo reciben los trabajos que tú les asignas. Tú manejas sus cuentas, contraseñas y comisiones."
      >
        <button className="ag-btn ag-btn-quiet" onClick={() => setPanel({ kind: 'link' })}>
          <Link2 />
          Vincular cuenta existente
        </button>
        <button className="ag-btn ag-btn-primary" onClick={() => setPanel({ kind: 'create' })}>
          <UserPlus />
          Agregar trabajador
        </button>
      </PageHead>

      <dl className="ag-figures">
        <div className="ag-figure">
          <dt>Trabajadores</dt>
          <dd>{workers.data ? all.length : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Conectados en la app</dt>
          <dd>{workers.data ? available : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>En un trabajo</dt>
          <dd>{workers.data ? busy : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Tu comisión general</dt>
          <dd>{settings.data ? rate(generalRate) : '—'}</dd>
        </div>
      </dl>

      <section className="ag-panel">
        <div className="ag-panel-head">
          <label className="ag-input-affix" style={{ flex: 1, maxWidth: 360 }}>
            <em>
              <Search size={16} />
            </em>
            <input
              className="ag-input"
              placeholder="Buscar por nombre, correo u oficio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar trabajador"
            />
          </label>
        </div>
        {workers.error && (
          <div className="ag-panel-body">
            <ErrorNote message={workers.error} onRetry={() => workers.reload()} />
          </div>
        )}
        {workers.loading && !workers.data ? (
          <SkeletonRows rows={5} />
        ) : all.length === 0 ? (
          <Empty
            title="Tu flota está vacía"
            action={
              <button className="ag-btn ag-btn-primary" onClick={() => setPanel({ kind: 'create' })}>
                <UserPlus />
                Agregar el primero
              </button>
            }
          >
            Crea la cuenta de cada trabajador: le darás su correo y contraseña para entrar a la app.
          </Empty>
        ) : list.length === 0 ? (
          <Empty title="Nadie coincide con la búsqueda" />
        ) : (
          <ul className="ag-rows">
            {list.map((w) => {
              const name = fullName(w.firstName, w.lastName);
              return (
                <li key={w.id} className="ag-row">
                  <Avatar name={name} src={w.profilePhotoUrl} dot={w.isBlocked ? 'off' : w.isAvailable ? 'on' : 'idle'} />
                  <div className="ag-row-main">
                    <div className="ag-row-title">{name}</div>
                    <div className="ag-row-sub">
                      <span title="Usuario para entrar a la app">{w.email}</span>
                      {w.phone && <span>{w.phone}</span>}
                      {w.skills.length > 0 && <span>{w.skills.slice(0, 3).join(', ')}</span>}
                    </div>
                  </div>
                  <div className="ag-row-actions">
                    {w.isBlocked && (
                      <span className="ag-chip" data-tone="red">
                        Bloqueado
                      </span>
                    )}
                    {w.activeJobsCount > 0 && (
                      <span className="ag-chip" data-tone="amber">
                        En un trabajo
                      </span>
                    )}
                    <button
                      className="ag-chip"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setPanel({ kind: 'commission', worker: w })}
                      title="Cambiar comisión"
                    >
                      {w.commissionRate == null ? `General ${rate(generalRate)}` : `Comisión ${rate(w.commissionRate)}`}
                    </button>
                    <button
                      className="ag-btn ag-btn-ghost ag-btn-sm"
                      onClick={() => navigate(`/avisos?para=${w.id}`)}
                      title={`Mandar un aviso a ${w.firstName}`}
                    >
                      <MessageSquare />
                      Aviso
                    </button>
                    <button
                      className="ag-btn ag-btn-ghost ag-btn-sm"
                      onClick={() => setPanel({ kind: 'password', worker: w })}
                    >
                      <KeyRound />
                      Contraseña
                    </button>
                    <button className="ag-btn ag-btn-quiet ag-btn-sm" onClick={() => setPanel({ kind: 'manage', worker: w })}>
                      Más
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {panel?.kind === 'create' && (
        <CreateWorkerSheet generalRate={generalRate} onClose={close} onCreated={refresh} />
      )}
      {panel?.kind === 'link' && <LinkWorkerSheet onClose={close} onLinked={refresh} />}
      {panel?.kind === 'password' && <PasswordSheet worker={panel.worker} onClose={close} />}
      {panel?.kind === 'commission' && (
        <CommissionSheet worker={panel.worker} generalRate={generalRate} onClose={close} onSaved={refresh} />
      )}
      {panel?.kind === 'manage' && <ManageSheet worker={panel.worker} onClose={close} onChanged={refresh} />}
    </>
  );
}

// ───────────── Credenciales ─────────────

function Credentials({ creds, name }: { creds: WorkerCredentials; name: string }) {
  const toast = useToast();
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado.');
    } catch {
      toast('No se pudo copiar. Selecciónalo y cópialo a mano.', 'error');
    }
  };
  const all = `Tu cuenta de Chamba\nUsuario: ${creds.email}\nContraseña: ${creds.password}\nDescarga la app Chamba e inicia sesión con estos datos.`;
  return (
    <div className="ag-creds" role="status">
      <strong>Datos de acceso de {name}</strong>
      <div className="ag-hint">Pásaselos ahora: esta contraseña no se vuelve a mostrar.</div>
      <dl>
        <dt>Usuario</dt>
        <dd>{creds.email}</dd>
        <button className="ag-btn ag-btn-ghost ag-iconbtn" onClick={() => copy(creds.email)} aria-label="Copiar usuario">
          <Copy />
        </button>
        <dt>Contraseña</dt>
        <dd>{creds.password}</dd>
        <button
          className="ag-btn ag-btn-ghost ag-iconbtn"
          onClick={() => copy(creds.password)}
          aria-label="Copiar contraseña"
        >
          <Copy />
        </button>
      </dl>
      <button className="ag-btn ag-btn-quiet ag-btn-sm" style={{ marginTop: 12 }} onClick={() => copy(all)}>
        <Copy />
        Copiar mensaje para enviarle
      </button>
    </div>
  );
}

// ───────────── Crear ─────────────

function CreateWorkerSheet({
  generalRate,
  onClose,
  onCreated,
}: {
  generalRate: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', skills: '', password: '' });
  const [ownPassword, setOwnPassword] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<WorkerCredentials | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const valid =
    form.firstName.trim() && /\S+@\S+\.\S+/.test(form.email) && (!ownPassword || form.password.length >= 8);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await createWorker({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: ownPassword ? form.password : undefined,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        commissionRate: customRate === '' ? null : Number(customRate),
      });
      setCreds(result);
      onCreated();
    } catch (err) {
      setError(errorText(err, 'No pudimos crear la cuenta.'));
    } finally {
      setSaving(false);
    }
  };

  if (creds) {
    return (
      <Sheet
        title="Cuenta creada"
        intro="Ya puede entrar a la app con estos datos."
        onClose={onClose}
        footer={
          <button className="ag-btn ag-btn-primary" onClick={onClose}>
            Listo
          </button>
        }
      >
        <Credentials creds={creds} name={form.firstName.trim()} />
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Agregar trabajador"
      intro="Creas su cuenta de Chamba. Solo recibirá los trabajos que tú le asignes."
      onClose={onClose}
      footer={
        <>
          <button className="ag-btn ag-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="ag-btn ag-btn-primary" disabled={!valid || saving} onClick={submit}>
            {saving ? 'Creando…' : 'Crear cuenta'}
          </button>
        </>
      }
    >
      <div className="ag-grid-2">
        <label className="ag-field">
          <span>Nombre</span>
          <input className="ag-input" value={form.firstName} onChange={set('firstName')} autoComplete="off" />
        </label>
        <label className="ag-field">
          <span>Apellido</span>
          <input className="ag-input" value={form.lastName} onChange={set('lastName')} autoComplete="off" />
        </label>
      </div>
      <label className="ag-field">
        <span>Correo</span>
        <input
          className="ag-input"
          type="email"
          value={form.email}
          onChange={set('email')}
          autoComplete="off"
          placeholder="jorge@gmail.com"
        />
        <small>Es su usuario para entrar a la app.</small>
      </label>
      <label className="ag-field">
        <span>Teléfono (opcional)</span>
        <input className="ag-input" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="70000000" />
      </label>
      <label className="ag-field">
        <span>Oficios (opcional)</span>
        <input className="ag-input" value={form.skills} onChange={set('skills')} placeholder="Limpieza, Plomería" />
        <small>Sepáralos con comas.</small>
      </label>

      <fieldset className="ag-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>Contraseña</span>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" checked={!ownPassword} onChange={() => setOwnPassword(false)} />
          Generar una por mí
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" checked={ownPassword} onChange={() => setOwnPassword(true)} />
          Escribir una
        </label>
        {ownPassword && (
          <input
            className="ag-input"
            value={form.password}
            onChange={set('password')}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
          />
        )}
      </fieldset>

      <label className="ag-field">
        <span>Tu comisión sobre sus trabajos</span>
        <div className="ag-input-affix">
          <em>
            <Percent size={15} />
          </em>
          <input
            className="ag-input"
            inputMode="decimal"
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder={`Vacío = la general (${rate(generalRate)})`}
          />
        </div>
      </label>

      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

// ───────────── Vincular ─────────────

function LinkWorkerSheet({ onClose, onLinked }: { onClose: () => void; onLinked: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await linkWorker(email.trim());
      toast('Trabajador vinculado a tu flota.');
      onLinked();
      onClose();
    } catch (err) {
      setError(errorText(err, 'No pudimos vincular esa cuenta.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      title="Vincular cuenta existente"
      intro="Para un trabajador que ya tiene cuenta en Chamba. Desde ahora solo recibirá trabajos de tu agencia."
      onClose={onClose}
      footer={
        <>
          <button className="ag-btn ag-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="ag-btn ag-btn-primary" disabled={!/\S+@\S+\.\S+/.test(email) || saving} onClick={submit}>
            {saving ? 'Vinculando…' : 'Vincular'}
          </button>
        </>
      }
    >
      <label className="ag-field">
        <span>Correo de su cuenta</span>
        <input className="ag-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

// ───────────── Contraseña ─────────────

function PasswordSheet({ worker, onClose }: { worker: AgencyWorker; onClose: () => void }) {
  const name = fullName(worker.firstName, worker.lastName);
  const [creds, setCreds] = useState<WorkerCredentials | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      setCreds(await resetWorkerPassword(worker.id));
    } catch (err) {
      setError(errorText(err, 'No pudimos cambiar la contraseña.'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Sheet
      title={creds ? 'Contraseña nueva' : `Contraseña de ${worker.firstName}`}
      intro={
        creds
          ? 'La anterior ya no sirve.'
          : 'Por seguridad nadie puede ver la contraseña actual. Puedes generar una nueva y pasársela.'
      }
      onClose={onClose}
      footer={
        creds ? (
          <button className="ag-btn ag-btn-primary" onClick={onClose}>
            Listo
          </button>
        ) : (
          <>
            <button className="ag-btn ag-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="ag-btn ag-btn-primary" disabled={saving} onClick={submit}>
              <KeyRound />
              {saving ? 'Generando…' : 'Generar contraseña nueva'}
            </button>
          </>
        )
      }
    >
      {creds ? (
        <Credentials creds={creds} name={name} />
      ) : (
        <div className="ag-panel" style={{ padding: '14px 16px' }}>
          <div className="ag-hint">Usuario</div>
          <strong style={{ fontSize: 17 }}>{worker.email}</strong>
          {worker.phone && <div className="ag-hint">También puede entrar con su teléfono {worker.phone}.</div>}
        </div>
      )}
      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

// ───────────── Comisión ─────────────

function CommissionSheet({
  worker,
  generalRate,
  onClose,
  onSaved,
}: {
  worker: AgencyWorker;
  generalRate: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [useGeneral, setUseGeneral] = useState(worker.commissionRate == null);
  const [value, setValue] = useState(worker.commissionRate == null ? '' : String(worker.commissionRate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numeric = Number(value);
  const valid = useGeneral || (value !== '' && numeric >= 0 && numeric <= 100);
  const example = 100 * (1 - (useGeneral ? generalRate : numeric || 0) / 100);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await setWorkerCommission(worker.id, useGeneral ? null : numeric);
      toast(`Comisión de ${worker.firstName} actualizada.`);
      onSaved();
      onClose();
    } catch (err) {
      setError(errorText(err, 'No pudimos guardar la comisión.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Comisión de ${worker.firstName}`}
      intro="Lo que tu agencia se queda de cada trabajo que hace. Solo cambia los trabajos que termine desde ahora."
      onClose={onClose}
      footer={
        <>
          <button className="ag-btn ag-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="ag-btn ag-btn-primary" disabled={!valid || saving} onClick={submit}>
            {saving ? 'Guardando…' : 'Guardar comisión'}
          </button>
        </>
      }
    >
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="radio" checked={useGeneral} onChange={() => setUseGeneral(true)} />
        Usar la general de la agencia ({rate(generalRate)})
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="radio" checked={!useGeneral} onChange={() => setUseGeneral(false)} />
        Una propia para {worker.firstName}
      </label>
      {!useGeneral && (
        <div className="ag-input-affix">
          <em>
            <Percent size={15} />
          </em>
          <input
            className="ag-input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
            aria-label="Comisión en porcentaje"
          />
        </div>
      )}
      {valid && (
        <p className="ag-hint">
          En un trabajo de Bs 100, {worker.firstName} recibe Bs {example.toLocaleString('es-BO', { maximumFractionDigits: 2 })}.
        </p>
      )}
      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

// ───────────── Más acciones ─────────────

function ManageSheet({
  worker,
  onClose,
  onChanged,
}: {
  worker: AgencyWorker;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = fullName(worker.firstName, worker.lastName);

  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      toast(done);
      onChanged();
      onClose();
    } catch (err) {
      setError(errorText(err, 'No pudimos completar la acción.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={name} intro={worker.email} onClose={onClose}>
      <div className="ag-panel">
        <ul className="ag-rows">
          <li className="ag-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            <div>
              <strong>{worker.isBlocked ? 'Desbloquear' : 'Bloquear'}</strong>
              <div className="ag-hint">
                {worker.isBlocked
                  ? 'Podrá volver a entrar a la app y recibir trabajos.'
                  : 'No podrá entrar a la app ni recibir trabajos hasta que lo desbloquees.'}
              </div>
            </div>
            <button
              className={`ag-btn ag-btn-sm ${worker.isBlocked ? 'ag-btn-quiet' : 'ag-btn-danger'}`}
              disabled={busy}
              onClick={() =>
                run(
                  () => toggleWorkerBlock(worker.id),
                  worker.isBlocked ? `${worker.firstName} fue desbloqueado.` : `${worker.firstName} fue bloqueado.`,
                )
              }
            >
              {worker.isBlocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </li>
          <li className="ag-row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
            <div>
              <strong>Quitar de la flota</strong>
              <div className="ag-hint">
                Su cuenta sigue existiendo, pero deja de ser de tu agencia y puede recibir trabajos de Chamba.
              </div>
            </div>
            <button
              className="ag-btn ag-btn-sm ag-btn-danger"
              disabled={busy || worker.activeJobsCount > 0}
              title={worker.activeJobsCount > 0 ? 'Tiene un trabajo en curso' : undefined}
              onClick={() => {
                if (window.confirm(`¿Quitar a ${name} de tu flota?`)) {
                  run(() => unlinkWorker(worker.id), `${worker.firstName} ya no está en tu flota.`);
                }
              }}
            >
              Quitar
            </button>
          </li>
        </ul>
      </div>
      {worker.activeJobsCount > 0 && (
        <p className="ag-hint">No puedes quitarlo mientras tenga un trabajo en curso.</p>
      )}
      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}
