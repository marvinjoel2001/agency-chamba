import { Link, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getActiveJobs,
  getAssignedJobs,
  getChambaAccount,
  getPayouts,
  getWorkers,
} from '../../lib/agency-api';
import { fullName, timeAgo } from '../../lib/utils';
import { Avatar, Empty, ErrorNote, Money, PageHead, SkeletonRows, dateTime, money, useLoad } from '../ui';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Home() {
  const { agency } = useAuth();
  const navigate = useNavigate();
  const account = useLoad(() => getChambaAccount());
  const payouts = useLoad(() => getPayouts());
  const open = useLoad(() => getActiveJobs());
  const assigned = useLoad(() => getAssignedJobs());
  const workers = useLoad(() => getWorkers());

  const running = (assigned.data ?? []).filter((j) => ['assigned', 'in_progress'].includes(j.status));
  const team = workers.data ?? [];
  const free = team.filter((w) => !w.isBlocked && w.activeJobsCount === 0);
  const chamba = account.data?.summary.balance ?? 0;
  const owed = payouts.data?.summary.owedToWorkers ?? 0;

  const summaryLine = () => {
    if (!open.data || !workers.data) return 'Cargando tu día…';
    const parts = [
      open.data.length === 1 ? '1 trabajo disponible' : `${open.data.length} trabajos disponibles`,
      running.length === 1 ? '1 en curso' : `${running.length} en curso`,
      free.length === 1 ? '1 trabajador libre' : `${free.length} trabajadores libres`,
    ];
    return `Hoy tienes ${parts[0]}, ${parts[1]} y ${parts[2]}.`;
  };

  return (
    <>
      <PageHead title={`${greeting()}, ${agency?.name ?? 'equipo'}`} intro={summaryLine()} />

      <div className="ag-ledger">
        <Link to="/pagos?vista=chamba" data-dir={chamba > 0 ? 'in' : chamba < 0 ? 'out' : undefined}>
          <span className="ag-ledger-label">
            {chamba > 0 ? 'Chamba te debe' : chamba < 0 ? 'Le debes a Chamba' : 'Con Chamba estás al día'}
          </span>
          <span className="ag-ledger-amount">
            {account.data ? (
              <Money value={Math.abs(chamba)} dir={chamba > 0 ? 'in' : chamba < 0 ? 'out' : undefined} />
            ) : (
              <span className="ag-skel" style={{ display: 'block', height: 40, width: 180 }} />
            )}
          </span>
          <span className="ag-ledger-note">
            {account.error
              ? 'No pudimos cargar esta cuenta.'
              : (() => {
                  const digital = account.data?.summary.digitalJobs ?? 0;
                  const cash = account.data?.summary.cashJobs ?? 0;
                  if (digital + cash === 0) return 'Aún no hay trabajos terminados.';
                  return `${digital === 1 ? '1 pago' : `${digital} pagos`} con QR o tarjeta, ${cash} en efectivo.`;
                })()}
          </span>
        </Link>
        <Link to="/pagos" data-dir={owed > 0 ? 'out' : undefined}>
          <span className="ag-ledger-label">{owed > 0 ? 'Le debes a tu flota' : 'Tu flota está al día'}</span>
          <span className="ag-ledger-amount">
            {payouts.data ? (
              <Money value={owed} dir={owed > 0 ? 'out' : undefined} />
            ) : (
              <span className="ag-skel" style={{ display: 'block', height: 40, width: 180 }} />
            )}
          </span>
          <span className="ag-ledger-note">
            {payouts.error
              ? 'No pudimos cargar los saldos.'
              : (() => {
                  const pending = (payouts.data?.workers ?? []).filter((w) => w.balance > 0).length;
                  return pending === 0
                    ? 'Nadie espera un pago.'
                    : pending === 1
                      ? '1 trabajador espera su pago.'
                      : `${pending} trabajadores esperan su pago.`;
                })()}
          </span>
        </Link>
      </div>

      <div className="ag-cols">
        <div className="ag-stack">
          <section className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <h2>Disponibles ahora</h2>
                <p>Trabajos publicados que puedes tomar.</p>
              </div>
              <Link className="ag-btn ag-btn-ghost ag-btn-sm" to="/trabajos">
                Ver todos
              </Link>
            </div>
            {open.error && (
              <div className="ag-panel-body">
                <ErrorNote message={open.error} onRetry={() => open.reload()} />
              </div>
            )}
            {open.loading && !open.data ? (
              <SkeletonRows rows={3} />
            ) : (open.data ?? []).length === 0 ? (
              <Empty title="Nada nuevo por ahora">Te avisaremos aquí cuando un cliente publique un trabajo.</Empty>
            ) : (
              <ul className="ag-rows">
                {open.data!.slice(0, 5).map((job) => (
                  <li key={job.id} className="ag-row">
                    <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
                      <MapPin size={18} />
                    </span>
                    <div className="ag-row-main">
                      <div className="ag-row-title">{job.title}</div>
                      <div className="ag-row-sub">
                        <span>{job.category}</span>
                        <span>{job.address}</span>
                        <span>{timeAgo(job.createdAt)}</span>
                      </div>
                    </div>
                    <div className="ag-row-actions">
                      <Money value={job.budget} />
                      <button
                        className="ag-btn ag-btn-primary ag-btn-sm"
                        onClick={() => navigate(`/trabajos?job=${job.id}`)}
                      >
                        {job.myOfferStatus === 'pending' ? 'Cambiar oferta' : 'Asignar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <h2>En curso</h2>
              </div>
              <Link className="ag-btn ag-btn-ghost ag-btn-sm" to="/trabajos?tab=active">
                Ver todos
              </Link>
            </div>
            {assigned.loading && !assigned.data ? (
              <SkeletonRows rows={2} />
            ) : running.length === 0 ? (
              <Empty title="Ningún trabajo en curso" />
            ) : (
              <ul className="ag-rows">
                {running.slice(0, 5).map((job) => (
                  <li key={job.offerId} className="ag-row">
                    <Avatar name={job.worker.name} src={job.worker.profilePhotoUrl} />
                    <div className="ag-row-main">
                      <div className="ag-row-title">{job.title}</div>
                      <div className="ag-row-sub">
                        <span>{job.worker.name}</span>
                        <span>{job.scheduledAt ? dateTime(job.scheduledAt) : `Aceptado ${timeAgo(job.offeredAt)}`}</span>
                      </div>
                    </div>
                    <div className="ag-row-actions">
                      <span className="ag-chip" data-tone={job.status === 'in_progress' ? 'amber' : 'violet'}>
                        {job.status === 'in_progress' ? 'Trabajando' : 'Asignado'}
                      </span>
                      <Money value={job.amount} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <h2>Tu flota</h2>
              <p>
                {workers.data
                  ? `${free.length} de ${team.length} sin trabajo en este momento.`
                  : 'Cargando…'}
              </p>
            </div>
            <Link className="ag-btn ag-btn-ghost ag-btn-sm" to="/flota">
              Gestionar
            </Link>
          </div>
          {workers.loading && !workers.data ? (
            <SkeletonRows rows={4} />
          ) : team.length === 0 ? (
            <Empty
              title="Agrega a tu primer trabajador"
              action={
                <Link className="ag-btn ag-btn-primary" to="/flota">
                  Ir a Mi flota
                </Link>
              }
            />
          ) : (
            <ul className="ag-rows">
              {team.slice(0, 8).map((w) => {
                const name = fullName(w.firstName, w.lastName);
                const balance = payouts.data?.workers.find((b) => b.workerId === w.id)?.balance ?? 0;
                return (
                  <li key={w.id} className="ag-row">
                    <Avatar name={name} src={w.profilePhotoUrl} dot={w.isBlocked ? 'off' : w.isAvailable ? 'on' : 'idle'} />
                    <div className="ag-row-main">
                      <div className="ag-row-title">{name}</div>
                      <div className="ag-row-sub">
                        <span>
                          {w.isBlocked ? 'Bloqueado' : w.activeJobsCount > 0 ? 'En un trabajo' : 'Libre'}
                        </span>
                        {balance > 0 && <span>Le debes {money(balance)}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
