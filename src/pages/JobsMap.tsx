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
  List,
  Map as MapIcon,
  Phone,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getActiveJobs, getWorkers, sendOffer } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, fullName, timeAgo, OFFER_STATUS_LABELS } from '../lib/utils';
import { CardSkeleton } from '../components/Skeleton';
import type { ActiveJob, AgencyWorker } from '../lib/types';
import './JobsMap.css';


// Centro inicial mientras no hay trabajos ni ubicación: Bolivia completa.
const DEFAULT_CENTER: [number, number] = [-17.0, -64.5];
const DEFAULT_ZOOM = 6;

// Título, dirección y nombres los escribe el usuario: se escapan antes de
// insertarlos en el HTML del popup de Leaflet.
const esc = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  );

const jobIcon = L.divIcon({
  className: '',
  html: '<div class="map-pin-marker"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const workerIcon = L.divIcon({
  className: '',
  html: '<div class="map-worker-marker"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const JobsMap = () => {
  const [jobs, setJobs] = useState<ActiveJob[] | null>(null);
  const [workers, setWorkers] = useState<AgencyWorker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Mobile segmented view switch: 'map' | 'list'
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  // Filtros: ubicación de la agencia (geolocalización del navegador), radio en km y categoría
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locating, setLocating] = useState(false);

  // Modal de Oferta
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
    // Refrescar la lista cuando llega un evento realtime de ofertas o solicitudes publicadas.
    const onRealtime = () => loadData();
    window.addEventListener('agency-realtime', onRealtime);
    return () => window.removeEventListener('agency-realtime', onRealtime);
  }, [loadData]);

  const availableWorkers = useMemo(
    () => workers.filter((worker) => !worker.isBlocked),
    [workers],
  );

  const openOfferModal = useCallback(
    (job: ActiveJob) => {
      setOfferJob(job);
      setOfferWorkerId(availableWorkers[0]?.id ?? '');
      setOfferAmount(String(job.budget));
      setOfferMessage('');
      setOfferError(null);
    },
    [availableWorkers],
  );

  useEffect(() => {
    const handleOpenOffer = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const jobId = customEvent.detail;
      const job = jobs?.find((j) => j.id === jobId);
      if (job) {
        openOfferModal(job);
      }
    };
    window.addEventListener('open-offer', handleOpenOffer);
    return () => window.removeEventListener('open-offer', handleOpenOffer);
  }, [jobs, openOfferModal]);

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

    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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
    if (!map || !markers) return;

    markers.clearLayers();
    const points: [number, number][] = [];

    if (source) {
      for (const job of source) {
        if (job.latitude == null || job.longitude == null) continue;
        const point: [number, number] = [job.latitude, job.longitude];
        points.push(point);

        L.marker(point, { icon: jobIcon })
          .bindPopup(
            `<div class="map-popup-card">
              <strong class="map-popup-title">${esc(job.title)}</strong>
              <div class="map-popup-badge">${esc(formatMoney(job.budget))} · ${esc(job.category)}</div>
              <p class="map-popup-address">📍 ${esc(job.address)}</p>
              <button onclick="window.dispatchEvent(new CustomEvent('open-offer', {detail: '${esc(job.id)}'}))" class="btn btn-primary btn-sm" style="margin-top: 8px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>Hacer Oferta</span>
              </button>
            </div>`,
          )
          .addTo(markers);
      }
    }

    for (const worker of workers) {
      if (worker.latitude == null || worker.longitude == null) continue;
      const point: [number, number] = [worker.latitude, worker.longitude];
      points.push(point);

      let waLink = '';
      if (worker.phone) {
        waLink = `<a href="https://wa.me/${worker.phone.replace(/\D/g, '')}" target="_blank" class="btn btn-sm" style="margin-top: 8px; display: flex; align-items: center; justify-content: center; background: #25D366; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">WhatsApp</a>`;
      }

      L.marker(point, { icon: workerIcon })
        .bindPopup(
          `<div class="map-popup-card">
            <strong class="map-popup-title">👷 ${esc(fullName(worker.firstName, worker.lastName))}</strong>
            <div style="font-size: 0.82rem; margin: 4px 0;">⭐ ${worker.averageRating.toFixed(1)} · ${worker.activeJobsCount} activos</div>
            ${waLink}
          </div>`,
        )
        .addTo(markers);
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [jobs, categoryFilter, workers]);

  // Invalidar tamaño de mapa al cambiar a la vista de mapa en mobile
  useEffect(() => {
    if (mobileView === 'map' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
    }
  }, [mobileView]);

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

  const focusJobOnMap = (job: ActiveJob) => {
    if (job.latitude != null && job.longitude != null && mapRef.current) {
      mapRef.current.setView([job.latitude, job.longitude], 15);
      // If in mobile, switch to map view automatically
      setMobileView('map');
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
      setSuccessMessage(`¡Oferta enviada exitosamente para "${offerJob.title}"!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setOfferError(getApiErrorMessage(err, 'No se pudo enviar la oferta.'));
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppWorker = () => {
    const selectedWorker = availableWorkers.find((w) => w.id === offerWorkerId);
    if (!selectedWorker || !selectedWorker.phone || !offerJob) return;

    const locUrl = `https://www.google.com/maps/search/?api=1&query=${offerJob.latitude},${offerJob.longitude}`;
    const text = `Hola ${selectedWorker.firstName}, hay una oportunidad de trabajo: "${offerJob.title}" en ${offerJob.address} por Bs ${offerJob.budget}. Ubicación en mapa: ${locUrl}`;
    window.open(
      `https://wa.me/${selectedWorker.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
      '_blank',
    );
  };

  return (
    <div className="jobs-page animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Explorar Trabajos</h1>
          <p>Encuentra solicitudes abiertas de clientes locales y asigna ofertas a tu equipo.</p>
        </div>

        {/* Filtros de ubicación, categoría y recarga */}
        <div className="jobs-header-actions">
          <button
            className={`btn btn-secondary ${origin ? 'filter-active' : ''}`}
            onClick={handleLocateMe}
            disabled={locating}
            title={origin ? 'Quitar filtro de ubicación' : 'Filtrar solicitudes cerca de mi ubicación'}
          >
            {locating ? <Loader2 size={16} className="spin" /> : <Crosshair size={16} />}
            <span>{origin ? `Cerca de mí (${radiusKm} km)` : 'Cerca de mí'}</span>
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
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {/* Selector de vista móvil (Mapa vs Lista) */}
      <div className="mobile-view-toggle glass-panel">
        <button
          className={`toggle-btn ${mobileView === 'map' ? 'active' : ''}`}
          onClick={() => setMobileView('map')}
        >
          <MapIcon size={16} />
          <span>Mapa</span>
        </button>
        <button
          className={`toggle-btn ${mobileView === 'list' ? 'active' : ''}`}
          onClick={() => setMobileView('list')}
        >
          <List size={16} />
          <span>Lista ({filteredJobs?.length ?? 0})</span>
        </button>
      </div>

      {successMessage && (
        <div className="success-toast glass-panel animate-fade-in">
          <CheckCircle2 size={18} color="var(--success)" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="page-feedback glass-panel animate-fade-in">
          <AlertCircle size={32} color="var(--danger)" />
          <p>{error}</p>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            Reintentar
          </button>
        </div>
      )}

      {/* Contenedor Responsivo Mapa + Lista */}
      <div className={`jobs-container ${mobileView}`}>
        {/* Vista de Mapa */}
        <div className="map-view glass-panel">
          <div ref={mapContainerRef} className="leaflet-map" />
        </div>

        {/* Vista de Lista de Trabajos */}
        <div className="jobs-list glass-panel">
          <div className="jobs-list-header">
            <h3>Trabajos Activos {filteredJobs ? `(${filteredJobs.length})` : ''}</h3>
            {categoryFilter && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCategoryFilter('')}
                title="Quitar filtro de categoría"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          <div className="jobs-scroll-area">
            {!error && filteredJobs === null && (
              <CardSkeleton count={3} />
            )}


            {!error && filteredJobs !== null && filteredJobs.length === 0 && (
              <div className="page-feedback">
                <MapPin size={28} color="var(--text-muted)" />
                <p>No hay solicitudes activas con estos filtros.</p>
                {(categoryFilter || origin) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setCategoryFilter('');
                      setOrigin(null);
                    }}
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            )}

            {filteredJobs?.map((job) => (
              <div
                key={job.id}
                className="job-card"
                onClick={() => focusJobOnMap(job)}
                title="Clic para enfocar en el mapa"
              >
                <div className="job-header">
                  <h4>{job.title}</h4>
                  <span className="job-price">{formatMoney(job.budget)}</span>
                </div>

                <div className="job-meta">
                  <span>
                    <MapPin size={13} /> {job.address}
                  </span>
                  <span>{timeAgo(job.createdAt)}</span>
                </div>

                <div className="job-meta">
                  <span className="badge">{job.category}</span>
                  <span className="fs-small text-muted">{job.pendingOffersCount} ofertas recibidas</span>
                </div>

                <div className="job-actions" onClick={(e) => e.stopPropagation()}>
                  {job.myOfferStatus === 'pending' || job.myOfferStatus === 'accepted' ? (
                    <span className="status-badge active">
                      Tu oferta: {OFFER_STATUS_LABELS[job.myOfferStatus] ?? job.myOfferStatus}
                    </span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openOfferModal(job)}
                    >
                      <Send size={13} />
                      <span>Hacer Oferta</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Enviar Oferta */}
      {offerJob && (
        <div className="modal-overlay" onClick={() => setOfferJob(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ofertar para: {offerJob.title}</h3>
              <button className="icon-btn" onClick={() => setOfferJob(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="text-muted fs-small modal-hint">
              Presupuesto propuesto por el cliente:{' '}
              <strong style={{ color: 'var(--success)' }}>{formatMoney(offerJob.budget)}</strong> ·{' '}
              {offerJob.address}
            </p>

            {availableWorkers.length === 0 ? (
              <div className="login-error">
                <AlertCircle size={16} />
                <span>
                  No tienes trabajadores vinculados o disponibles. Añade uno desde la pestaña "Trabajadores".
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendOffer}>
                <div className="input-group">
                  <label>Trabajador que ejecutará el trabajo</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="input-field"
                      style={{ flex: 1 }}
                      value={offerWorkerId}
                      onChange={(e) => setOfferWorkerId(e.target.value)}
                      required
                    >
                      {availableWorkers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {fullName(worker.firstName, worker.lastName)}
                          {worker.isAvailable ? '' : ' (en trabajo)'}
                          {worker.latitude == null ? ' [Sin GPS]' : ''}
                          {` · ★ ${worker.averageRating.toFixed(1)}`}
                        </option>
                      ))}
                    </select>

                    {availableWorkers.find((w) => w.id === offerWorkerId)?.phone && (
                      <button
                        type="button"
                        onClick={handleWhatsAppWorker}
                        className="btn"
                        style={{
                          background: '#25D366',
                          color: 'white',
                          padding: '0 12px',
                          borderColor: '#25D366',
                        }}
                        title="Enviar detalles del trabajo al trabajador por WhatsApp"
                      >
                        <Phone size={15} />
                        <span>Avisar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="input-group">
                  <label>Monto de la oferta para el cliente (Bs)</label>
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
                  <label>Mensaje o garantía de tu agencia (opcional)</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Ej: Contamos con herramientas profesionales y garantía de puntualidad..."
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
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setOfferJob(null)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? <Loader2 size={16} className="spin" /> : <Send size={15} />}
                    <span>Enviar Oferta</span>
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
