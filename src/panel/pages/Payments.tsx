import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Banknote, CreditCard, Trash2 } from 'lucide-react';
import { createPayout, deletePayout, getChambaAccount, getPayouts } from '../../lib/agency-api';
import type { ChambaAccountData, PayoutsData, WorkerBalance } from '../../lib/types';
import {
  Avatar,
  Empty,
  ErrorNote,
  Money,
  PageHead,
  Sheet,
  SkeletonRows,
  dateTime,
  errorText,
  money,
  rate,
  shortDate,
  useLoad,
  useToast,
} from '../ui';

export default function Payments() {
  const [params, setParams] = useSearchParams();
  const view = params.get('vista') === 'chamba' ? 'chamba' : 'flota';
  const setView = (v: 'flota' | 'chamba') => setParams(v === 'chamba' ? { vista: 'chamba' } : {}, { replace: true });

  return (
    <>
      <PageHead
        title="Pagos"
        intro="Lo que le toca a cada trabajador después de tu comisión, lo que ya le pagaste y tus cuentas con Chamba."
      />
      <div className="ag-tabs" role="tablist">
        <button role="tab" aria-selected={view === 'flota'} onClick={() => setView('flota')}>
          Mi flota
        </button>
        <button role="tab" aria-selected={view === 'chamba'} onClick={() => setView('chamba')}>
          Cuenta con Chamba
        </button>
      </div>
      {view === 'flota' ? <CrewPayments /> : <ChambaAccount />}
    </>
  );
}

// ───────────── Mi flota ─────────────

function balanceLabel(balance: number) {
  if (balance > 0) return { text: 'Le debes', dir: 'out' as const };
  if (balance < 0) return { text: 'Te debe', dir: 'in' as const };
  return { text: 'Al día', dir: undefined };
}

function CrewPayments() {
  const toast = useToast();
  const data = useLoad<PayoutsData>(() => getPayouts());
  const [paying, setPaying] = useState<WorkerBalance | null>(null);

  const remove = async (id: string) => {
    if (!window.confirm('¿Borrar este pago? Usa esto solo si lo registraste por error.')) return;
    try {
      await deletePayout(id);
      toast('Pago borrado.');
      data.reload(true);
    } catch (err) {
      toast(errorText(err, 'No pudimos borrar el pago.'), 'error');
    }
  };

  if (data.error) return <ErrorNote message={data.error} onRetry={() => data.reload()} />;
  const summary = data.data?.summary;

  return (
    <div className="ag-stack">
      <dl className="ag-figures" style={{ marginBottom: 0 }}>
        <div className="ag-figure">
          <dt>Le debes a tu flota</dt>
          <dd>{summary ? <Money value={summary.owedToWorkers} dir={summary.owedToWorkers > 0 ? 'out' : undefined} /> : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Te deben tus trabajadores</dt>
          <dd>{summary ? <Money value={summary.owedByWorkers} dir={summary.owedByWorkers > 0 ? 'in' : undefined} /> : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Pagado en total</dt>
          <dd>{summary ? money(summary.paidTotal) : '—'}</dd>
        </div>
      </dl>

      <section className="ag-panel">
        <div className="ag-panel-head">
          <div>
            <h2>Saldo por trabajador</h2>
            <p>Solo cuentan los trabajos terminados.</p>
          </div>
        </div>
        {data.loading && !data.data ? (
          <SkeletonRows />
        ) : data.data!.workers.length === 0 ? (
          <Empty title="Aún no hay trabajos terminados">Cuando tu flota termine trabajos, verás aquí cuánto le toca a cada uno.</Empty>
        ) : (
          <ul className="ag-rows">
            {data.data!.workers.map((w) => {
              const label = balanceLabel(w.balance);
              return (
                <li key={w.workerId} className="ag-row">
                  <Avatar name={w.workerName} src={w.profilePhotoUrl} />
                  <div className="ag-row-main">
                    <div className="ag-row-title">{w.workerName}</div>
                    <div className="ag-row-sub">
                      <span>{w.jobsCount === 1 ? '1 trabajo' : `${w.jobsCount} trabajos`}</span>
                      <span>Generó {money(w.generated)}</span>
                      <span>Tu parte {money(w.agencyCut)}</span>
                      <span>Le toca {money(w.earned)}</span>
                      <span>Pagado {money(w.paid)}</span>
                      {w.lastPaidAt && <span>Último pago {shortDate(w.lastPaidAt)}</span>}
                    </div>
                  </div>
                  <div className="ag-row-actions">
                    <span style={{ textAlign: 'right' }}>
                      <span className="ag-hint" style={{ display: 'block' }}>
                        {label.text}
                      </span>
                      {w.balance !== 0 && <Money value={Math.abs(w.balance)} dir={label.dir} />}
                    </span>
                    <button className="ag-btn ag-btn-quiet ag-btn-sm" onClick={() => setPaying(w)}>
                      Registrar pago
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ag-panel">
        <div className="ag-panel-head">
          <div>
            <h2>Pagos registrados</h2>
          </div>
        </div>
        {data.data && data.data.history.length === 0 ? (
          <Empty title="No registraste pagos todavía" />
        ) : (
          <ul className="ag-rows">
            {(data.data?.history ?? []).map((p) => (
              <li key={p.id} className="ag-row">
                <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
                  <Banknote size={18} />
                </span>
                <div className="ag-row-main">
                  <div className="ag-row-title">{p.workerName}</div>
                  <div className="ag-row-sub">
                    <span>{dateTime(p.paidAt)}</span>
                    <span>{p.kind === 'kept_cash' ? 'Cobró en efectivo al cliente' : 'Le pagaste'}</span>
                    {p.note && <span>{p.note}</span>}
                  </div>
                </div>
                <div className="ag-row-actions">
                  <Money value={p.amount} />
                  <button
                    className="ag-btn ag-btn-ghost ag-iconbtn"
                    onClick={() => remove(p.id)}
                    aria-label="Borrar pago"
                    title="Borrar pago"
                  >
                    <Trash2 />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {paying && (
        <PayoutSheet
          worker={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            data.reload(true);
          }}
        />
      )}
    </div>
  );
}

function PayoutSheet({
  worker,
  onClose,
  onSaved,
}: {
  worker: WorkerBalance;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(worker.balance > 0 ? String(worker.balance) : '');
  const [kind, setKind] = useState<'paid' | 'kept_cash'>('paid');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount.replace(',', '.'));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createPayout({ workerId: worker.workerId, amount: value, kind, note: note.trim() || undefined });
      toast(`Pago de ${money(value)} a ${worker.workerName} registrado.`);
      onSaved();
    } catch (err) {
      setError(errorText(err, 'No pudimos registrar el pago.'));
    } finally {
      setSaving(false);
    }
  };

  const after = Math.round((worker.balance - (value || 0)) * 100) / 100;

  return (
    <Sheet
      title="Registrar pago"
      intro={worker.workerName}
      onClose={onClose}
      footer={
        <>
          <button className="ag-btn ag-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="ag-btn ag-btn-primary" disabled={!(value > 0) || saving} onClick={submit}>
            {saving ? 'Guardando…' : 'Registrar pago'}
          </button>
        </>
      }
    >
      <fieldset className="ag-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>¿Qué pasó?</span>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" checked={kind === 'paid'} onChange={() => setKind('paid')} />
          Le pagué (efectivo, transferencia o QR)
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="radio" checked={kind === 'kept_cash'} onChange={() => setKind('kept_cash')} />
          Él cobró en efectivo al cliente y se quedó el dinero
        </label>
      </fieldset>
      <label className="ag-field">
        <span>Monto</span>
        <div className="ag-input-affix">
          <em>Bs</em>
          <input
            className="ag-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          />
        </div>
      </label>
      <label className="ag-field">
        <span>Nota (opcional)</span>
        <input
          className="ag-input"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: Transferencia BNB, semana 41"
        />
      </label>
      <p className="ag-hint">
        {after > 0
          ? `Después de esto le seguirás debiendo ${money(after)}.`
          : after < 0
            ? `Después de esto ${worker.workerName.split(' ')[0]} te deberá ${money(-after)}.`
            : 'Con esto quedan al día.'}
      </p>
      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

// ───────────── Cuenta con Chamba ─────────────

function ChambaAccount() {
  const data = useLoad<ChambaAccountData>(() => getChambaAccount());
  if (data.error) return <ErrorNote message={data.error} onRetry={() => data.reload()} />;
  if (data.loading && !data.data) {
    return (
      <section className="ag-panel">
        <SkeletonRows />
      </section>
    );
  }
  const { summary, jobs, settlements } = data.data!;
  const dir = summary.balance > 0 ? 'in' : summary.balance < 0 ? 'out' : undefined;

  return (
    <div className="ag-stack">
      <div className="ag-ledger" style={{ gridTemplateColumns: 'minmax(0,1fr)', marginBottom: 0 }}>
        <a data-dir={dir} href="#detalle">
          <span className="ag-ledger-label">
            {summary.balance > 0 ? 'Chamba te debe' : summary.balance < 0 ? 'Le debes a Chamba' : 'Estás al día con Chamba'}
          </span>
          <span className="ag-ledger-amount">
            <Money value={Math.abs(summary.balance)} dir={dir} />
          </span>
          <span className="ag-ledger-note">
            {summary.balance > 0
              ? 'Chamba te transfiere este saldo en la próxima liquidación.'
              : summary.balance < 0
                ? 'Es la comisión de Chamba por los trabajos cobrados en efectivo.'
                : 'No hay saldos pendientes.'}
          </span>
        </a>
      </div>

      <dl className="ag-figures" style={{ marginBottom: 0 }}>
        <div className="ag-figure">
          <dt>Cobrado por Chamba (QR o tarjeta)</dt>
          <dd>{money(summary.digitalCollected)}</dd>
        </div>
        <div className="ag-figure">
          <dt>Comisión de Chamba en esos pagos</dt>
          <dd>{money(summary.digitalFees)}</dd>
        </div>
        <div className="ag-figure">
          <dt>Comisión por trabajos en efectivo</dt>
          <dd>{money(summary.cashFees)}</dd>
        </div>
        <div className="ag-figure">
          <dt>Chamba ya te pagó</dt>
          <dd>{money(summary.paidToAgency)}</dd>
        </div>
        <div className="ag-figure">
          <dt>Ya le pagaste a Chamba</dt>
          <dd>{money(summary.paidToChamba)}</dd>
        </div>
      </dl>

      <section className="ag-panel" id="detalle">
        <div className="ag-panel-head">
          <div>
            <h2>Trabajos terminados</h2>
            <p>
              Si el cliente pagó con QR o tarjeta, el dinero lo recibe Chamba y te lo pasa sin su comisión. Si pagó en
              efectivo, tú le debes la comisión a Chamba.
            </p>
          </div>
        </div>
        {jobs.length === 0 ? (
          <Empty title="Aún no hay trabajos terminados" />
        ) : (
          <ul className="ag-rows">
            {jobs.map((j) => (
              <li key={j.requestId} className="ag-row">
                <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
                  {j.isDigital ? <CreditCard size={18} /> : <Banknote size={18} />}
                </span>
                <div className="ag-row-main">
                  <div className="ag-row-title">{j.title}</div>
                  <div className="ag-row-sub">
                    <span>{j.workerName}</span>
                    <span>{shortDate(j.completedAt)}</span>
                    <span>{j.isDigital ? 'QR o tarjeta' : 'Efectivo'}</span>
                    <span>
                      {money(j.amount)}, comisión {rate(j.chambaRate)} = {money(j.chambaFee)}
                    </span>
                  </div>
                </div>
                <div className="ag-row-actions">
                  <Money value={j.effect} dir={j.effect >= 0 ? 'in' : 'out'} signed />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ag-panel">
        <div className="ag-panel-head">
          <div>
            <h2>Liquidaciones</h2>
            <p>Las registra Chamba cuando te paga o recibe tu pago. Si algo no cuadra, escribe a soporte.</p>
          </div>
        </div>
        {settlements.length === 0 ? (
          <Empty title="Sin liquidaciones todavía" />
        ) : (
          <ul className="ag-rows">
            {settlements.map((s) => (
              <li key={s.id} className="ag-row">
                <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
                  <Banknote size={18} />
                </span>
                <div className="ag-row-main">
                  <div className="ag-row-title">
                    {s.direction === 'to_agency' ? 'Chamba te pagó' : 'Le pagaste a Chamba'}
                  </div>
                  <div className="ag-row-sub">
                    <span>{dateTime(s.createdAt)}</span>
                    {s.note && <span>{s.note}</span>}
                  </div>
                </div>
                <div className="ag-row-actions">
                  <Money value={s.amount} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
