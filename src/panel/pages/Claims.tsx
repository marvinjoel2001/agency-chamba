import { ShieldAlert } from 'lucide-react';
import { getDisputes } from '../../lib/agency-api';
import { Empty, ErrorNote, PageHead, SkeletonRows, dateTime, useLoad } from '../ui';

const STATUS: Record<string, { text: string; tone: string }> = {
  open: { text: 'Abierto', tone: 'red' },
  pending: { text: 'Abierto', tone: 'red' },
  in_review: { text: 'En revisión', tone: 'amber' },
  resolved: { text: 'Resuelto', tone: 'green' },
  closed: { text: 'Cerrado', tone: '' },
};

export default function Claims() {
  const claims = useLoad(() => getDisputes());

  return (
    <>
      <PageHead
        title="Reclamos"
        intro="Problemas que clientes reportaron sobre tus trabajadores. El equipo de Chamba los revisa y decide."
      />
      <section className="ag-panel">
        {claims.error && (
          <div className="ag-panel-body">
            <ErrorNote message={claims.error} onRetry={() => claims.reload()} />
          </div>
        )}
        {claims.loading && !claims.data ? (
          <SkeletonRows />
        ) : (claims.data ?? []).length === 0 ? (
          <Empty title="Sin reclamos">Cuando un cliente reporte un problema con tu flota, aparecerá aquí.</Empty>
        ) : (
          <ul className="ag-rows">
            {claims.data!.map((d) => {
              const status = STATUS[d.status] ?? { text: d.status, tone: '' };
              return (
                <li key={d.id} className="ag-row">
                  <span className="ag-avatar" style={{ borderRadius: 11 }} aria-hidden="true">
                    <ShieldAlert size={18} />
                  </span>
                  <div className="ag-row-main">
                    <div className="ag-row-title">{d.reason}</div>
                    {d.description && <p style={{ margin: '2px 0 4px', color: 'var(--ink-2)' }}>{d.description}</p>}
                    <div className="ag-row-sub">
                      <span>Trabajador: {d.worker.name}</span>
                      <span>Reportó: {d.reportedBy.name}</span>
                      <span>Trabajo: {d.requestTitle}</span>
                      <span>{dateTime(d.createdAt)}</span>
                    </div>
                    {d.resolution && (
                      <p className="ag-hint" style={{ margin: '6px 0 0' }}>
                        Resolución: {d.resolution}
                      </p>
                    )}
                  </div>
                  <div className="ag-row-actions">
                    <span className="ag-chip" data-tone={status.tone}>
                      {status.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
