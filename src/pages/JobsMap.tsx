import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  RefreshCw,
  Send,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
  Crosshair,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getActiveJobs, getWorkers, sendOffer } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, fullName, timeAgo, OFFER_STATUS_LABELS } from '../lib/utils';
import type { ActiveJob, AgencyWorker } from '../lib/types';
import './JobsMap.css';

// Centro por defecto: La Paz, Bolivia.
const DEFAULT_CENTER: [number, number] = [-16.4897, -68.1193];

const jobIcon = L.divIcon({
  className: '',
  html: '<div class="map-pin-marker"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const JobsMap = () => {
  const [jobs, setJobs] = useState<ActiveJob[] | null>(null);
  const [workers, setWorkers] = useState<AgencyWorker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros: ubicación de la agencia (geolocalización del navegador),
  // radio en km y categoría (client-side).
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locating, setLocating] = useState(false);

  const [offerJob, setOfferJob] = useState<ActiveJob | null>(null);
  const [offerWorkerId, setOfferWorkerId] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerError, setOfferError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [jobsResult, workersResult] = await Promise.all([
        getActiveJobs(
          origin ? { lat: origin.lat, lng: origin.lng, radiusKm } : undefined,
        ),
        getWorkers(),
      ]);
      setJobs(jobsResult);
      setWorkers(workersResult);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar los trabajos activos.'));
    }
  }, [origin, radiusKm]);

  useEffect(() => {
    loadData();
    // Refrescar la lista cuando llega un evento realtime de ofertas.
    const onRealtime = () => loadData();
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, [loadData]);

  const handleLocateMe = () => {
    if (origin) {
      setOrigin(null);
      return;
    }
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        mapRef.current?.setView(
          [position.coords.latitude, position.coords.longitude],
          13,
        );
      },
      () => {
        setLocating(false);
        setError('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Inicializa el mapa Leaflet una sola vez.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Redibuja los marcadores cuando cambian los trabajos o el filtro.
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    const source = categoryFilter
      ? jobs?.filter((job) => job.category === categoryFilter)
      : jobs;
    if (!map || !markers || !source) return;

    markers.clearLayers();
    const points: [number, number][] = [];

    for (const job of source) {
      if (job.latitude == null || job.longitude == null) continue;
      const point: [number, number] = [job.latitude, job.longitude];
      points.push(point);

      L.marker(point, { icon: jobIcon })
        .bindPopup(
          `<div class="map-popup">
            <strong>${job.title}</strong><br/>
            ${formatMoney(job.budget)} · ${job.category}<br/>
            <span>${job.address}</span>
          </div>`,
        )
        .addTo(markers);
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [jobs, categoryFilter]);

  const availableWorkers = useMemo(
    () => workers.filter((worker) => !worker.isBlocked),
    [workers],
  );

  const categories = useMemo(() => {
    const unique = new Set((jobs ?? []).map((job) => job.category).filter(Boolean));
    return [...unique].sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return null;
    if (!categoryFilter) return jobs;
    return jobs.filter((job) => job.category === categoryFilter);
  }, [jobs, categoryFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openOfferModal = (job: ActiveJob) => {
    setOfferJob(job);
    setOfferWorkerId(availableWorkers[0]?.id ?? '');
    setOfferAmount(String(job.budget));
    setOfferMessage('');
    setOfferError(null);
  };

  const focusJobOnMap = (job: ActiveJob) => {
    if (job.latitude != null && job.longitude != null && mapRef.current) {
      mapRef.current.setView([job.latitude, job.longitude], 15);
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerJob) return;
    setOfferError(null);
    setSending(true);
    try {
      await sendOffer(offerJob.id, {
        workerUserId: offerWorkerId,
        amount: Number(offerAmount),
        message: offerMessage.trim() || undefined,
      });
      setOfferJob(null);
      setSuccessMessage(`Oferta enviada para "${offerJob.title}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setOfferError(getApiErrorMessage(err, 'No se pudo enviar la oferta.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="jobs-page">
      <header className="page-header">
        <div>
          <h1>Explorar Trabajos</h1>
          <p>Busca oportunidades y asigna trabajos a tu equipo.</p>
        </div>
        <div className="header-actions">
          <button
            className={`btn btn-secondary ${origin ? 'filter-active' : ''}`}
            onClick={handleLocateMe}
            disabled={locating}
            title={origin ? 'Quitar filtro de ubicación' : 'Filtrar trabajos cerca de mi ubicación'}
          >
            {locating ? <Loader2 size={18} className="spin" /> : <Crosshair size={18} />}
            {origin ? `Cerca de mí (${radiusKm} km)` : 'Cerca de mí'}
          </button>
          {origin && (
            <select
              className="input-field filter-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          )}
          <select
            className="input-field filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="success-toast glass-panel">
          <CheckCircle2 size={18} color="var(--success)" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="jobs-container">
        <div className="map-view glass-panel">
          <div ref={mapContainerRef} className="leaflet-map" />
        </div>

        <div className="jobs-list glass-panel">
          <h3>Trabajos Activos {filteredJobs ? `(${filteredJobs.length})` : ''}</h3>
          <div className="jobs-scroll-area">
            {error && (
              <div className="page-feedback">
                <AlertCircle size={24} color="var(--danger)" />
                <p>{error}</p>
              </div>
            )}
            {!error && filteredJobs === null && (
              <div className="page-feedback">
                <Loader2 size={24} className="spin" color="var(--primary)" />
                <p>Cargando trabajos...</p>
              </div>
            )}
            {!error && filteredJobs !== null && filteredJobs.length === 0 && (
              <div className="page-feedback">
                <MapPin size={24} />
                <p>No hay solicitudes activas con estos filtros.</p>
              </div>
            )}
            {filteredJobs?.map((job) => (
              <div key={job.id} className="job-card" onClick={() => focusJobOnMap(job)}>
                <div className="job-header">
                  <h4>{job.title}</h4>
                  <span className="job-price">{formatMoney(job.budget)}</span>
                </div>
                <div className="job-meta">
                  <span><MapPin size={12} /> {job.address}</span>
                  <span>{timeAgo(job.createdAt)}</span>
                </div>
                <div className="job-meta">
                  <span className="badge">{job.category}</span>
                  <span>{job.pendingOffersCount} ofertas en juego</span>
                </div>
                <div className="job-actions">
                  {job.myOfferStatus ? (
                    <span className="status-badge active">
                      Tu oferta: {OFFER_STATUS_LABELS[job.myOfferStatus] ?? job.myOfferStatus}
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openOfferModal(job);
                      }}
                    >
                      <Send size={14} /> Ofertar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {offerJob && (
        <div className="modal-overlay" onClick={() => setOfferJob(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ofertar: {offerJob.title}</h3>
              <button className="icon-btn" onClick={() => setOfferJob(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted fs-small modal-hint">
              Presupuesto del cliente: <strong>{formatMoney(offerJob.budget)}</strong> ·{' '}
              {offerJob.address}
            </p>

            {availableWorkers.length === 0 ? (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>No tienes trabajadores vinculados. Añade uno desde "Trabajadores".</span>
              </div>
            ) : (
              <form onSubmit={handleSendOffer}>
                <div className="input-group">
                  <label>Trabajador</label>
                  <select
                    className="input-field"
                    value={offerWorkerId}
                    onChange={(e) => setOfferWorkerId(e.target.value)}
                    required
                  >
                    {availableWorkers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {fullName(worker.firstName, worker.lastName)}
                        {worker.isAvailable ? '' : ' (no disponible)'}
                        {` · ★ ${worker.averageRating.toFixed(1)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Monto de la oferta (Bs)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    step="0.5"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Mensaje para el cliente (opcional)</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Nuestro trabajador tiene experiencia en este tipo de trabajos..."
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                  />
                </div>

                {offerError && (
                  <div className="login-error">
                    <AlertCircle size={16} />
                    <span>{offerError}</span>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setOfferJob(null)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                    Enviar Oferta
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsMap;
