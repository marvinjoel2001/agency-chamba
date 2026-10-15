import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CalendarClock, Map as MapIcon, MapPin, Send, Users } from 'lucide-react';
import { getActiveJobs, getAssignedJobs, getWorkers, sendOffer } from '../../lib/agency-api';
import type { ActiveJob, AgencyWorker, AssignedJob } from '../../lib/types';
import { fullName, timeAgo } from '../../lib/utils';
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
  useLoad,
  useToast,
} from '../ui';

type Tab = 'open' | 'active' | 'done';

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  assigned: { text: 'Asignado', tone: 'violet' },
  in_progress: { text: 'En curso', tone: 'amber' },
  completed: { text: 'Terminado', tone: 'green' },
  cancelled: { text: 'Cancelado', tone: 'red' },
};

const OFFER_LABEL: Record<string, { text: string; tone: string }> = {
  pending: { text: 'Oferta enviada', tone: 'violet' },
  accepted: { text: 'Aceptada', tone: 'green' },
  declined: { text: 'Rechazada', tone: 'red' },
  rejected: { text: 'Rechazada', tone: 'red' },
  expired: { text: 'Venció', tone: 'amber' },
};

function useRefreshOnEvents(reload: (quiet?: boolean) => void) {
  useEffect(() => {
    const handler = () => reload(true);
    window.addEventListener('agency:refresh', handler);
    return () => window.removeEventListener('agency:refresh', handler);
  }, [reload]);
}

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'open';
  const [showMap, setShowMap] = useState(false);

  const open = useLoad(() => getActiveJobs());
  const assigned = useLoad(() => getAssignedJobs());
  const workers = useLoad(() => getWorkers());
  useRefreshOnEvents(open.reload);
  useRefreshOnEvents(assigned.reload);

  const jobId = params.get('job');
  const selected = open.data?.find((j) => j.id === jobId) ?? null;

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    p.delete('job');
    setParams(p, { replace: true });
  };
  const openJob = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('job', id);
    else p.delete('job');
    setParams(p);
  };

  const inProgress = (assigned.data ?? []).filter((j) => ['assigned', 'in_progress'].includes(j.status));
  const history = (assigned.data ?? []).filter((j) => !['assigned', 'in_progress'].includes(j.status));

  return (
    <>
      <PageHead
        title="Trabajos"
        intro="Toma un trabajo, ponle precio y elige quién de tu flota lo hará. El cliente recibe la oferta con el nombre de tu trabajador."
      >
        {tab === 'open' && (
          <button className="ag-btn ag-btn-quiet" onClick={() => setShowMap((v) => !v)}>
            <MapIcon />
            {showMap ? 'Ocultar mapa' : 'Ver en el mapa'}
          </button>
        )}
      </PageHead>

      <div className="ag-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'open'} onClick={() => setTab('open')}>
          Disponibles{open.data ? ` (${open.data.length})` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'active'} onClick={() => setTab('active')}>
          En curso{assigned.data ? ` (${inProgress.length})` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'done'} onClick={() => setTab('done')}>
          Historial
        </button>
      </div>

      {tab === 'open' && (
        <section className="ag-panel">
          {showMap && open.data && <JobsMap jobs={open.data} onPick={openJob} />}
          {open.error && (
            <div className="ag-panel-body">
              <ErrorNote message={open.error} onRetry={() => open.reload()} />
            </div>
          )}
          {open.loading && !open.data ? (
            <SkeletonRows />
          ) : open.data && open.data.length === 0 ? (
            <Empty title="No hay trabajos disponibles ahora">
              Cuando un cliente publique uno, aparecerá aquí al instante.
            </Empty>
          ) : (
            <ul className="ag-rows">
              {open.data?.map((job) => (
                <OpenJobRow key={job.id} job={job} onAssign={() => openJob(job.id)} />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab !== 'open' && (
        <section className="ag-panel">
          {assigned.error && (
            <div className="ag-panel-body">
              <ErrorNote message={assigned.error} onRetry={() => assigned.reload()} />
            </div>
          )}
          {assigned.loading && !assigned.data ? (
            <SkeletonRows />
          ) : (tab === 'active' ? inProgress : history).length === 0 ? (
            <Empty
              title={tab === 'active' ? 'Ningún trabajo en curso' : 'Aún no hay trabajos terminados'}
              action={
                tab === 'active' && (
                  <button className="ag-btn ag-btn-primary" onClick={() => setTab('open')}>
                    Ver trabajos disponibles
                  </button>
                )
              }
            >
              {tab === 'active'
                ? 'Cuando un cliente acepte una de tus ofertas, el trabajo aparecerá aquí.'
                : 'Los trabajos terminados y cancelados quedan guardados aquí.'}
            </Empty>
          ) : (
            <ul className="ag-rows">
              {(tab === 'active' ? inProgress : history).map((job) => (
                <AssignedRow key={job.offerId} job={job} />
              ))}
            </ul>
          )}
        </section>
      )}

      {selected && (
        <AssignSheet
          job={selected}
          workers={workers.data ?? []}
          workersError={workers.error}
          onClose={() => openJob(null)}
          onSent={() => {
            openJob(null);
            open.reload(true);
          }}
        />
      )}
    </>
  );
}

function OpenJobRow({ job, onAssign }: { job: ActiveJob; onAssign: () => void }) {
  const offer = job.myOfferStatus ? OFFER_LABEL[job.myOfferStatus] : null;
  return (
    <li className="ag-row">
      <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
        <MapPin size={18} />
      </span>
      <div className="ag-row-main">
        <div className="ag-row-title">{job.title}</div>
        <div className="ag-row-sub">
          <span>{job.category}</span>
          <span>{job.address}</span>
          <span>{timeAgo(job.createdAt)}</span>
          {job.pendingOffersCount > 0 && (
            <span>
              <Users /> {job.pendingOffersCount} {job.pendingOffersCount === 1 ? 'oferta' : 'ofertas'}
            </span>
          )}
        </div>
      </div>
      <div className="ag-row-actions">
        {offer && (
          <span className="ag-chip" data-tone={offer.tone}>
            {offer.text}
          </span>
        )}
        <Money value={job.budget} />
        <button className="ag-btn ag-btn-primary ag-btn-sm" onClick={onAssign}>
          {job.myOfferStatus === 'pending' ? 'Cambiar oferta' : 'Asignar'}
        </button>
      </div>
    </li>
  );
}

function AssignedRow({ job }: { job: AssignedJob }) {
  const status = STATUS_LABEL[job.status] ?? { text: job.status, tone: '' };
  return (
    <li className="ag-row">
      <Avatar name={job.worker.name} src={job.worker.profilePhotoUrl} />
      <div className="ag-row-main">
        <div className="ag-row-title">{job.title}</div>
        <div className="ag-row-sub">
          <span>{job.worker.name}</span>
          <span>Cliente: {job.clientName}</span>
          <span>
            <CalendarClock />
            {job.completedAt
              ? `Terminado ${dateTime(job.completedAt)}`
              : job.scheduledAt
                ? dateTime(job.scheduledAt)
                : `Aceptado ${timeAgo(job.offeredAt)}`}
          </span>
        </div>
      </div>
      <div className="ag-row-actions">
        <span className="ag-chip" data-tone={status.tone}>
          {status.text}
        </span>
        <Money value={job.amount} />
      </div>
    </li>
  );
}

function AssignSheet({
  job,
  workers,
  workersError,
  onClose,
  onSent,
}: {
  job: ActiveJob;
  workers: AgencyWorker[];
  workersError: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const toast = useToast();
  const ordered = useMemo(
    () =>
      [...workers].sort(
        (a, b) =>
          Number(a.isBlocked) - Number(b.isBlocked) ||
          a.activeJobsCount - b.activeJobsCount ||
          Number(b.isAvailable) - Number(a.isAvailable) ||
          b.averageRating - a.averageRating,
      ),
    [workers],
  );
  const firstFree = ordered.find((w) => !w.isBlocked && w.activeJobsCount === 0);
  const [workerId, setWorkerId] = useState(firstFree?.id ?? '');
  const [amount, setAmount] = useState(String(job.budget || ''));
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La lista puede llegar después de abrir la hoja.
  useEffect(() => {
    if (!workerId && firstFree) setWorkerId(firstFree.id);
  }, [workerId, firstFree]);
  const chosen = workers.find((w) => w.id === workerId);
  const value = Number(amount.replace(',', '.'));

  const submit = async () => {
    if (!chosen || !(value > 0)) return;
    setSending(true);
    setError(null);
    try {
      await sendOffer(job.id, { workerUserId: chosen.id, amount: value, message: message.trim() || undefined });
      toast(`Oferta de ${money(value)} enviada con ${fullName(chosen.firstName, chosen.lastName)}.`);
      onSent();
    } catch (err) {
      setError(errorText(err, 'No pudimos enviar la oferta. Inténtalo de nuevo.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      title="Asignar trabajo"
      intro={job.title}
      onClose={onClose}
      footer={
        <>
          <button className="ag-btn ag-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="ag-btn ag-btn-primary"
            disabled={!chosen || !(value > 0) || sending}
            onClick={submit}
          >
            <Send />
            {sending
              ? 'Enviando…'
              : chosen
                ? `Enviar oferta con ${chosen.firstName}`
                : 'Elige un trabajador'}
          </button>
        </>
      }
    >
      <div className="ag-panel" style={{ padding: '14px 16px' }}>
        <div className="ag-row-sub" style={{ marginBottom: 6 }}>
          <span>{job.category}</span>
          <span>{job.address}</span>
          {job.scheduledAt && <span>Para {dateTime(job.scheduledAt)}</span>}
        </div>
        {job.description && <p style={{ margin: 0 }}>{job.description}</p>}
        <p className="ag-hint" style={{ margin: '8px 0 0' }}>
          El cliente propone <strong>{money(job.budget)}</strong>
          {job.priceType ? ` (${job.priceType.toLowerCase()})` : ''}.
        </p>
      </div>

      <div className="ag-field">
        <span>¿Quién lo hará?</span>
        {workersError ? (
          <ErrorNote message={workersError} />
        ) : ordered.length === 0 ? (
          <p className="ag-hint">Primero agrega trabajadores en Mi flota.</p>
        ) : (
          <div className="ag-pick" role="radiogroup">
            {ordered.map((w) => {
              const name = fullName(w.firstName, w.lastName);
              return (
                <label key={w.id} aria-disabled={w.isBlocked}>
                  <input
                    type="radio"
                    name="worker"
                    value={w.id}
                    checked={workerId === w.id}
                    disabled={w.isBlocked}
                    onChange={() => setWorkerId(w.id)}
                  />
                  <Avatar name={name} src={w.profilePhotoUrl} dot={w.isAvailable ? 'on' : 'idle'} />
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block' }}>{name}</strong>
                    <span className="ag-hint">
                      {w.isBlocked
                        ? 'Bloqueado'
                        : w.activeJobsCount > 0
                          ? `Ocupado: ${w.activeJobsCount} en curso`
                          : w.skills.slice(0, 3).join(', ') || 'Libre'}
                    </span>
                  </span>
                  {w.averageRating > 0 && <span className="ag-hint">★ {w.averageRating.toFixed(1)}</span>}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <label className="ag-field">
        <span>Precio de tu oferta</span>
        <div className="ag-input-affix">
          <em>Bs</em>
          <input
            className="ag-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          />
        </div>
        <small>Es lo que paga el cliente. Tu comisión y la de Chamba se descuentan al terminar.</small>
      </label>

      <label className="ag-field">
        <span>Mensaje para el cliente (opcional)</span>
        <textarea
          className="ag-textarea"
          maxLength={300}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ej: Llegamos con materiales y herramientas."
        />
      </label>

      {error && <ErrorNote message={error} />}
    </Sheet>
  );
}

function JobsMap({ jobs, onPick }: { jobs: ActiveJob[]; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current).setView([-16.5, -68.15], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const points: L.LatLngExpression[] = [];
    for (const job of jobs) {
      if (job.latitude == null || job.longitude == null) continue;
      const point: L.LatLngExpression = [job.latitude, job.longitude];
      points.push(point);
      L.circleMarker(point, { radius: 9, color: '#6d28d9', weight: 3, fillColor: '#ffffff', fillOpacity: 1 })
        .bindTooltip(`${job.title}: ${money(job.budget)}`)
        .on('click', () => onPick(job.id))
        .addTo(layer);
    }
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
  }, [jobs, onPick]);

  return <div className="ag-map" ref={ref} />;
}
