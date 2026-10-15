import { useState } from 'react';
import { getReports } from '../../lib/agency-api';
import type { AgencyReportsData } from '../../lib/types';
import { Avatar, Empty, ErrorNote, Money, PageHead, SkeletonRows, money, shortDate, useLoad } from '../ui';

const PERIODS = [
  ['month', 'Este mes'],
  ['last_month', 'Mes pasado'],
  ['quarter', 'Últimos 3 meses'],
  ['year', 'Este año'],
  ['all', 'Todo'],
] as const;

export default function Reports() {
  const [period, setPeriod] = useState<string>('month');
  const report = useLoad<AgencyReportsData>(() => getReports({ period }), [period]);
  const s = report.data?.summary;

  return (
    <>
      <PageHead title="Reportes" intro="Cuánto generó tu flota y cuánto se quedó tu agencia, por trabajador." />

      <div className="ag-tabs" role="tablist">
        {PERIODS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={period === key} onClick={() => setPeriod(key)}>
            {label}
          </button>
        ))}
      </div>

      {report.error && <ErrorNote message={report.error} onRetry={() => report.reload()} />}

      <dl className="ag-figures">
        <div className="ag-figure">
          <dt>Generado (terminados)</dt>
          <dd>{s ? money(s.totalRevenue) : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Tu parte</dt>
          <dd>{s ? <Money value={s.agencyEarnings} dir="in" /> : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Para tu flota</dt>
          <dd>{s ? money(s.workersPayout) : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Trabajos terminados</dt>
          <dd>{s ? s.completedJobsCount : '—'}</dd>
        </div>
        <div className="ag-figure">
          <dt>Ticket promedio</dt>
          <dd>{s ? money(s.averageTicket) : '—'}</dd>
        </div>
      </dl>

      <section className="ag-panel">
        <div className="ag-panel-head">
          <div>
            <h2>Por trabajador</h2>
            <p>Los trabajos en curso aún no suman: su monto puede cambiar.</p>
          </div>
        </div>
        {report.loading && !report.data ? (
          <SkeletonRows />
        ) : (report.data?.workers ?? []).length === 0 ? (
          <Empty title="Sin datos en este periodo" />
        ) : (
          <ul className="ag-rows">
            {report.data!.workers.map((w) => (
              <li key={w.workerId} className="ag-row">
                <Avatar name={w.workerName} src={w.profilePhotoUrl} />
                <div className="ag-row-main">
                  <div className="ag-row-title">{w.workerName}</div>
                  <div className="ag-row-sub">
                    <span>{w.completedJobs} terminados</span>
                    {w.inProgressJobs > 0 && <span>{w.inProgressJobs} en curso</span>}
                    <span>Promedio {money(w.averageJobValue)}</span>
                    {w.averageRating > 0 && <span>★ {w.averageRating.toFixed(1)}</span>}
                  </div>
                </div>
                <div className="ag-row-actions" style={{ textAlign: 'right' }}>
                  <span>
                    <span className="ag-hint" style={{ display: 'block' }}>
                      Generó
                    </span>
                    <Money value={w.totalGenerated} />
                  </span>
                  <span>
                    <span className="ag-hint" style={{ display: 'block' }}>
                      Tu parte
                    </span>
                    <Money value={w.agencyCommission} dir="in" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(report.data?.jobs ?? []).length > 0 && (
        <section className="ag-panel" style={{ marginTop: 18 }}>
          <div className="ag-panel-head">
            <div>
              <h2>Trabajos del periodo</h2>
            </div>
          </div>
          <ul className="ag-rows">
            {report.data!.jobs.slice(0, 50).map((j) => (
              <li key={j.offerId} className="ag-row">
                <Avatar name={j.worker.name} src={j.worker.profilePhotoUrl} />
                <div className="ag-row-main">
                  <div className="ag-row-title">{j.title}</div>
                  <div className="ag-row-sub">
                    <span>{j.worker.name}</span>
                    <span>Cliente: {j.clientName}</span>
                    <span>{shortDate(j.completedAt ?? j.offeredAt)}</span>
                    <span>{j.status === 'completed' ? 'Terminado' : 'En curso'}</span>
                  </div>
                </div>
                <div className="ag-row-actions">
                  <Money value={j.amount} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
