import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Printer,
  RefreshCw,
  Search,
  X,
  Briefcase,
  Star,
  Eye,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Phone,
} from 'lucide-react';
import { getReports } from '../lib/agency-api';
import { getApiErrorMessage } from '../lib/api';
import { formatMoney, initials } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { StatSkeleton, TableSkeleton } from '../components/Skeleton';
import type { AgencyReportsData, WorkerReportItem } from '../lib/types';

import './Reports.css';

type PeriodType = 'month' | 'last_month' | 'quarter' | 'year' | 'all';

const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
  { id: 'month', label: 'Este Mes' },
  { id: 'last_month', label: 'Mes Anterior' },
  { id: 'quarter', label: 'Últimos 3 Meses' },
  { id: 'year', label: 'Este Año' },
  { id: 'all', label: 'Todo el Histórico' },
];

const Reports = () => {
  const { agency } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<AgencyReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<PeriodType>(
    (searchParams.get('period') as PeriodType) || 'month',
  );
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    searchParams.get('workerId') || '',
  );
  const [textSearch, setTextSearch] = useState('');

  // Modal for individual worker statement
  const [activeWorkerModal, setActiveWorkerModal] = useState<WorkerReportItem | null>(null);

  const loadReports = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);
      try {
        const result = await getReports({
          period,
          workerId: selectedWorkerId || undefined,
        });
        setData(result);
      } catch (err) {
        setError(getApiErrorMessage(err, 'No se pudieron cargar los informes financieros.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, selectedWorkerId],
  );

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Update query params when filters change
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    const params = new URLSearchParams(searchParams);
    params.set('period', newPeriod);
    setSearchParams(params);
  };

  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId);
    const params = new URLSearchParams(searchParams);
    if (workerId) params.set('workerId', workerId);
    else params.delete('workerId');
    setSearchParams(params);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports(true);
  };

  // Filtered workers & jobs based on search
  const filteredWorkers = useMemo(() => {
    if (!data?.workers) return [];
    if (!textSearch.trim()) return data.workers;
    const q = textSearch.toLowerCase();
    return data.workers.filter(
      (w) =>
        w.workerName.toLowerCase().includes(q) ||
        w.skills?.some((s) => s.toLowerCase().includes(q)),
    );
  }, [data?.workers, textSearch]);

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    if (!textSearch.trim()) return data.jobs;
    const q = textSearch.toLowerCase();
    return data.jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.clientName.toLowerCase().includes(q) ||
        j.worker.name.toLowerCase().includes(q) ||
        j.category.toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q),
    );
  }, [data?.jobs, textSearch]);

  // CSV Export Generator
  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['INFORME FINANCIERO Y LIQUIDACIONES - CHAMBA ENTERPRISE'],
      [`Agencia: ${agency?.name ?? 'Agencia Chamba'}`],
      [`Fecha de generación: ${new Date().toLocaleString('es-BO')}`],
      [`Periodo: ${PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? period}`],
      [`Comisión de Agencia: ${data.summary.commissionRate}%`],
      [''],
      ['--- RESUMEN GLOBAL ---'],
      ['Métrica', 'Valor'],
      ['Dinero Total Facturado (Bs)', data.summary.totalRevenue.toFixed(2)],
      ['Ganancia Neta Agencia (Bs)', data.summary.agencyEarnings.toFixed(2)],
      ['Pago Neto a Trabajadores (Bs)', data.summary.workersPayout.toFixed(2)],
      ['Trabajos Totales', data.summary.totalJobsCount],
      ['Trabajos Completados', data.summary.completedJobsCount],
      ['Ticket Promedio por Trabajo (Bs)', data.summary.averageTicket.toFixed(2)],
      [''],
      ['--- DESGLOSE POR TRABAJADOR ---'],
      [
        'ID Trabajador',
        'Nombre Trabajador',
        'Trabajos Hechos',
        'Total Generado (Bs)',
        'Comisión Agencia (Bs)',
        'Neto a Pagar al Trabajador (Bs)',
        'Promedio por Trabajo (Bs)',
      ],
      ...data.workers.map((w) => [
        w.workerId,
        `"${w.workerName}"`,
        w.totalJobs,
        w.totalGenerated.toFixed(2),
        w.agencyCommission.toFixed(2),
        w.workerPayout.toFixed(2),
        w.averageJobValue.toFixed(2),
      ]),
      [''],
      ['--- LIBRO DE TRABAJOS Y ASIGNACIONES ---'],
      [
        'ID Solicitud',
        'Fecha',
        'Título de Trabajo',
        'Categoría',
        'Cliente',
        'Trabajador Asignado',
        'Monto Total (Bs)',
        'Ganancia Agencia (Bs)',
        'Neto Trabajador (Bs)',
        'Estado',
      ],
      ...data.jobs.map((j) => [
        j.requestId,
        new Date(j.offeredAt).toLocaleDateString('es-BO'),
        `"${j.title}"`,
        `"${j.category}"`,
        `"${j.clientName}"`,
        `"${j.worker.name}"`,
        j.amount.toFixed(2),
        j.agencyCommission.toFixed(2),
        j.workerEarnings.toFixed(2),
        j.status,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `informe_financiero_${agency?.name?.replace(/\s+/g, '_') ?? 'agencia'}_${period}_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppSettlement = (worker: WorkerReportItem) => {
    if (!worker.phone) return;
    const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? period;
    const msg = `Hola ${worker.workerName}, te enviamos tu informe de liquidación de *${agency?.name ?? 'la Agencia'}* (${periodLabel}):\n\n` +
      `📌 Trabajos completados: ${worker.completedJobs}\n` +
      `💰 Dinero total generado: ${formatMoney(worker.totalGenerated)}\n` +
      `🏢 Comisión de agencia (${data?.summary.commissionRate ?? 0}%): ${formatMoney(worker.agencyCommission)}\n` +
      `💵 *Monto neto para ti: ${formatMoney(worker.workerPayout)}*\n\n` +
      `¡Gracias por tu excelente labor en el equipo!`;

    window.open(
      `https://wa.me/${worker.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`,
      '_blank',
    );
  };

  return (
    <div className="reports-page page-enter">
      {/* Print-Only Official Letterhead Header */}
      <div className="print-only-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', margin: 0 }}>{agency?.name ?? 'AGENCIA DE SERVICIOS'}</h1>
            <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#555' }}>
              Chamba Enterprise Platform · Razón Social / Agencia Autorizada
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Contacto: {agency?.contactEmail} {agency?.contactPhone ? `| Tel: ${agency.contactPhone}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0 }}>ESTADO DE CUENTA Y LIQUIDACIONES</h3>
            <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>
              Periodo: <strong>{PERIOD_OPTIONS.find((p) => p.id === period)?.label}</strong>
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
              Emisión: {new Date().toLocaleString('es-BO')}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Top Header (Screen Only) */}
      <header className="page-header no-print">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={24} color="var(--primary)" />
            <h1>Informes y Finanzas</h1>
          </div>
          <p>
            Rendimiento económico, dinero total generado, comisiones retenidas y saldos netos por trabajador.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Recargar informes"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>Actualizar</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handlePrint}
            title="Imprimir o guardar como PDF oficial"
          >
            <Printer size={16} />
            <span>Imprimir / PDF</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            disabled={!data}
            title="Descargar informe completo en Excel / CSV"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </header>

      {/* Filter Controls (Screen Only) */}
      <div className="reports-controls no-print">
        {/* Period Selector Pills */}
        <div className="period-chips">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`period-chip ${period === opt.id ? 'active' : ''}`}
              onClick={() => handlePeriodChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Worker Select & Search Bar */}
        <div className="reports-filter-bar">
          <div className="search-bar glass-panel" style={{ flex: 2, minWidth: 240 }}>
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Filtrar por trabajador, cliente, especialidad o trabajo..."
              className="search-input"
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
            />
            {textSearch && (
              <button className="icon-btn" onClick={() => setTextSearch('')} title="Limpiar">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="input-field worker-select-filter"
            value={selectedWorkerId}
            onChange={(e) => handleWorkerChange(e.target.value)}
          >
            <option value="">Todos los trabajadores ({data?.workers.length ?? 0})</option>
            {data?.workers.map((w) => (
              <option key={w.workerId} value={w.workerId}>
                {w.workerName} ({formatMoney(w.totalGenerated)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="page-feedback glass-panel animate-fade-in">
          <AlertCircle size={36} color="var(--danger)" />
          <h3>Error al cargar informes</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => loadReports()} style={{ marginTop: 12 }}>
            <RefreshCw size={16} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <>
          <StatSkeleton count={4} />
          <TableSkeleton rows={4} />
        </>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          {/* KPI Summary Cards */}
          <section className="stats-grid">
            {/* KPI 1: Dinero Total Generado */}
            <div className="stat-card glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Dinero Total Generado</span>
                <div className="kpi-icon-wrapper" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                  <DollarSign size={22} />
                </div>
              </div>
              <div>
                <div className="kpi-value" style={{ color: 'var(--success)' }}>
                  {formatMoney(data.summary.totalRevenue)}
                </div>
                <div className="kpi-subtext">
                  <span>Facturado en {data.summary.totalJobsCount} trabajos adjudicados</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Ganancia de la Agencia */}
            <div className="stat-card glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Ganancia de la Agencia</span>
                <div className="kpi-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <TrendingUp size={22} />
                </div>
              </div>
              <div>
                <div className="kpi-value" style={{ color: 'var(--primary)' }}>
                  {formatMoney(data.summary.agencyEarnings)}
                </div>
                <div className="kpi-subtext">
                  <span className="kpi-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {data.summary.commissionRate}% comisión pactada
                  </span>
                  <span>ganancia neta</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Pago Neto a Trabajadores */}
            <div className="stat-card glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Pago a Trabajadores</span>
                <div className="kpi-icon-wrapper" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Users size={22} />
                </div>
              </div>
              <div>
                <div className="kpi-value">
                  {formatMoney(data.summary.workersPayout)}
                </div>
                <div className="kpi-subtext">
                  <span>Total neto a liquidar al equipo</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Ticket Promedio y Volumen */}
            <div className="stat-card glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Rendimiento Operativo</span>
                <div className="kpi-icon-wrapper" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <Briefcase size={22} />
                </div>
              </div>
              <div>
                <div className="kpi-value" style={{ fontSize: '1.45rem' }}>
                  {formatMoney(data.summary.averageTicket)}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                    promedio
                  </span>
                </div>
                <div className="kpi-subtext">
                  <span>{data.summary.completedJobsCount} completados · {data.summary.inProgressJobsCount} en curso</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 1: Desglose y Ganancias por Trabajador */}
          <section className="reports-section">
            <div className="section-title-bar">
              <div>
                <h2>Rendimiento y Liquidaciones por Trabajador</h2>
                <p className="fs-small text-muted">
                  Cuánto dinero generó cada integrante de tu equipo y cuánto le corresponde a la agencia.
                </p>
              </div>
              <span className="badge">
                {filteredWorkers.length} {filteredWorkers.length === 1 ? 'trabajador' : 'trabajadores'}
              </span>
            </div>

            <div className="glass-panel table-container">
              <table className="workers-table">
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Trabajos</th>
                    <th style={{ textAlign: 'right' }}>Total Generado</th>
                    <th style={{ textAlign: 'right' }}>Ganancia Agencia ({data.summary.commissionRate}%)</th>
                    <th style={{ textAlign: 'right' }}>Neto al Trabajador</th>
                    <th style={{ textAlign: 'right' }}>Promedio</th>
                    <th style={{ textAlign: 'right' }} className="no-print">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-muted empty-row">
                        No hay trabajadores registrados en este periodo con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {filteredWorkers.map((w) => (
                    <tr
                      key={w.workerId}
                      className="worker-table-row worker-report-row"
                      onClick={() => setActiveWorkerModal(w)}
                      title="Clic para ver detalle de trabajos"
                    >
                      <td>
                        <div className="worker-cell">
                          <div className="worker-avatar-small">
                            {w.profilePhotoUrl ? (
                              <img src={w.profilePhotoUrl} alt={w.workerName} />
                            ) : (
                              initials(w.workerName)
                            )}
                          </div>
                          <div>
                            <p className="fw-600 worker-name-clickable">{w.workerName}</p>
                            <div className="flex gap-1 items-center" style={{ marginTop: 2 }}>
                              <Star size={12} color="var(--warning)" fill="var(--warning)" />
                              <span className="fs-small text-muted">{w.averageRating.toFixed(1)}</span>
                              {w.skills && w.skills.length > 0 && (
                                <span className="badge" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                                  {w.skills[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div>
                          <strong>{w.totalJobs}</strong>
                          <span className="fs-small text-muted" style={{ display: 'block' }}>
                            {w.completedJobs} comp. / {w.inProgressJobs} act.
                          </span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatMoney(w.totalGenerated)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="amount-gain">
                        {formatMoney(w.agencyCommission)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="amount-worker">
                        {formatMoney(w.workerPayout)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="fs-small text-muted">
                        {formatMoney(w.averageJobValue)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="no-print">
                        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="icon-btn table-action-btn"
                            title="Ver estado de cuenta detallado"
                            onClick={() => setActiveWorkerModal(w)}
                          >
                            <Eye size={16} />
                          </button>
                          {w.phone && (
                            <button
                              className="btn btn-sm"
                              style={{
                                background: '#25D366',
                                borderColor: '#25D366',
                                color: '#fff',
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                              }}
                              onClick={() => handleWhatsAppSettlement(w)}
                              title="Enviar resumen de liquidación por WhatsApp"
                            >
                              <Phone size={13} />
                              <span>Liquidar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Libro Contable Detallado de Trabajos */}
          <section className="reports-section" style={{ marginTop: 12 }}>
            <div className="section-title-bar">
              <div>
                <h2>Libro Contable de Trabajos</h2>
                <p className="fs-small text-muted">Registro individual de cada servicio adjudicado y su corte económico.</p>
              </div>
              <span className="badge">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'servicio' : 'servicios'}
              </span>
            </div>

            <div className="glass-panel table-container">
              <table className="workers-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Servicio / Categoría</th>
                    <th>Cliente</th>
                    <th>Trabajador</th>
                    <th style={{ textAlign: 'right' }}>Monto Total</th>
                    <th style={{ textAlign: 'right' }}>Comisión Agencia</th>
                    <th style={{ textAlign: 'right' }}>Neto Trabajador</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-muted empty-row">
                        No hay servicios registrados en este periodo.
                      </td>
                    </tr>
                  )}
                  {filteredJobs.map((job) => (
                    <tr key={job.offerId}>
                      <td className="fs-small text-muted">
                        {new Date(job.offeredAt).toLocaleDateString('es-BO')}
                      </td>
                      <td>
                        <p className="fw-600">{job.title}</p>
                        <span className="badge" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                          {job.category}
                        </span>
                      </td>
                      <td className="fs-small">{job.clientName}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="worker-avatar-small" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                            {job.worker.profilePhotoUrl ? (
                              <img src={job.worker.profilePhotoUrl} alt={job.worker.name} />
                            ) : (
                              initials(job.worker.name)
                            )}
                          </div>
                          <span className="fs-small fw-600">{job.worker.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatMoney(job.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="amount-gain">
                        {formatMoney(job.agencyCommission)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="amount-worker">
                        {formatMoney(job.workerEarnings)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            job.status === 'completed'
                              ? 'active'
                              : job.status === 'cancelled'
                              ? 'inactive'
                              : 'done'
                          }`}
                        >
                          {job.status === 'completed'
                            ? 'Completado'
                            : job.status === 'assigned'
                            ? 'En curso'
                            : job.status === 'in_progress'
                            ? 'Trabajando'
                            : job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Official Signatures Grid for Printable Report */}
          <div className="print-signature-grid">
            <div>
              <div className="signature-line">Firma Administración Agencia Chamba</div>
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
                {agency?.name} · Control y Aprobación
              </p>
            </div>
            <div>
              <div className="signature-line">Firma Liquidación de Fondos</div>
              <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
                Revisión Contable y Pagos a Trabajadores
              </p>
            </div>
          </div>
        </>
      )}

      {/* Modal: Estado de Cuenta y Desglose por Trabajador */}
      {activeWorkerModal && (
        <div className="modal-overlay" onClick={() => setActiveWorkerModal(null)}>
          <div className="modal glass-panel" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Building2 size={20} color="var(--primary)" />
                <h3>Estado de Cuenta: {activeWorkerModal.workerName}</h3>
              </div>
              <button className="icon-btn" onClick={() => setActiveWorkerModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Worker Summary Banner */}
            <div className="profile-detail-card glass-panel" style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 style={{ fontSize: '1.15rem' }}>{activeWorkerModal.workerName}</h4>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <Star size={14} color="var(--warning)" fill="var(--warning)" />
                    <span className="fs-small">{activeWorkerModal.averageRating.toFixed(1)} calificación</span>
                    <span>·</span>
                    <span className="fs-small text-muted">{activeWorkerModal.totalJobs} trabajos en periodo</span>
                  </div>
                </div>
                {activeWorkerModal.phone && (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    onClick={() => handleWhatsAppSettlement(activeWorkerModal)}
                  >
                    <Phone size={14} />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>

              <div className="worker-metrics-grid" style={{ marginTop: 14 }}>
                <div className="metric-box glass-panel">
                  <span className="text-muted fs-small">Total Generado</span>
                  <strong style={{ fontSize: '1.2rem' }}>
                    {formatMoney(activeWorkerModal.totalGenerated)}
                  </strong>
                </div>
                <div className="metric-box glass-panel">
                  <span className="text-muted fs-small">Comisión Agencia ({data?.summary.commissionRate}%)</span>
                  <strong className="amount-gain" style={{ fontSize: '1.2rem' }}>
                    {formatMoney(activeWorkerModal.agencyCommission)}
                  </strong>
                </div>
                <div className="metric-box glass-panel">
                  <span className="text-muted fs-small">Neto Trabajador</span>
                  <strong className="amount-worker" style={{ fontSize: '1.2rem' }}>
                    {formatMoney(activeWorkerModal.workerPayout)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Detailed jobs for this worker */}
            <h4 style={{ marginBottom: 10, fontSize: '0.95rem' }}>
              Trabajos Realizados ({activeWorkerModal.jobs?.length ?? 0})
            </h4>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {(!activeWorkerModal.jobs || activeWorkerModal.jobs.length === 0) && (
                <p className="text-muted fs-small" style={{ padding: '16px 0', textAlign: 'center' }}>
                  No se registraron trabajos concluidos para este trabajador en el periodo seleccionado.
                </p>
              )}
              {activeWorkerModal.jobs?.map((job) => (
                <div key={job.offerId} className="statement-job-item">
                  <div className="statement-job-header">
                    <strong>{job.title}</strong>
                    <span className="badge">{job.category}</span>
                  </div>
                  <div className="flex justify-between fs-small text-muted">
                    <span>Cliente: {job.clientName}</span>
                    <span>{new Date(job.offeredAt).toLocaleDateString('es-BO')}</span>
                  </div>
                  <div className="statement-amounts-row">
                    <span>Total: <strong>{formatMoney(job.amount)}</strong></span>
                    <span className="amount-gain">
                      Comisión: {formatMoney(job.agencyCommission)}
                    </span>
                    <span className="amount-worker">
                      Neto: {formatMoney(job.workerEarnings)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveWorkerModal(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
