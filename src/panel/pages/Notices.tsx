import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BellRing, Send } from 'lucide-react';
import { getMessages, getWorkers, sendMessage } from '../../lib/agency-api';
import { fullName } from '../../lib/utils';
import { Avatar, Empty, ErrorNote, PageHead, SkeletonRows, dateTime, errorText, useLoad, useToast } from '../ui';

const TEMPLATES = [
  { title: 'Trabajo nuevo para ti', body: 'Te asigné un trabajo. Revisa la app para ver la dirección y la hora.' },
  { title: 'Reunión del equipo', body: 'Nos vemos mañana a las 8:00 en la oficina.' },
  { title: 'Pago realizado', body: 'Ya te transferí lo de tus trabajos de esta semana. Revisa tu cuenta.' },
];

export default function Notices() {
  const toast = useToast();
  const [params] = useSearchParams();
  const workers = useLoad(() => getWorkers());
  const history = useLoad(() => getMessages());

  const preselected = params.get('para');
  const [audience, setAudience] = useState<'all' | 'some'>(preselected ? 'some' : 'all');
  const [picked, setPicked] = useState<string[]>(preselected ? [preselected] : []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselected) {
      setAudience('some');
      setPicked([preselected]);
    }
  }, [preselected]);

  const team = (workers.data ?? []).filter((w) => !w.isBlocked);
  const toggle = (id: string) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  // Un id que llegó por ?para= de un bloqueado no está en la lista: no cuenta ni se envía.
  const recipients = picked.filter((id) => team.some((w) => w.id === id));
  const count = audience === 'all' ? team.length : recipients.length;
  const valid = title.trim() && body.trim() && count > 0;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage({
        title: title.trim(),
        body: body.trim(),
        workerIds: audience === 'all' ? 'all' : recipients,
      });
      toast(
        sent.recipients === 1
          ? 'Aviso enviado.'
          : `Aviso enviado a ${sent.recipients} trabajadores.`,
      );
      setTitle('');
      setBody('');
      history.reload(true);
    } catch (err) {
      setError(errorText(err, 'No pudimos enviar el aviso.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHead
        title="Avisos"
        intro="Llega como notificación al celular de tus trabajadores y queda guardado en la pestaña Notificaciones de su app."
      />

      <div className="ag-cols">
        <section className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <h2>Nuevo aviso</h2>
            </div>
          </div>
          <div className="ag-panel-body" style={{ display: 'grid', gap: 16 }}>
            <div className="ag-field">
              <span>Para</span>
              <div className="ag-tabs" role="tablist" style={{ marginBottom: 0 }}>
                <button role="tab" aria-selected={audience === 'all'} onClick={() => setAudience('all')}>
                  Toda la flota
                </button>
                <button role="tab" aria-selected={audience === 'some'} onClick={() => setAudience('some')}>
                  Elegir trabajadores
                </button>
              </div>
            </div>

            {audience === 'some' && (
              workers.loading && !workers.data ? (
                <SkeletonRows rows={2} />
              ) : team.length === 0 ? (
                <p className="ag-hint">No tienes trabajadores activos.</p>
              ) : (
                <div className="ag-pick">
                  {team.map((w) => {
                    const name = fullName(w.firstName, w.lastName);
                    return (
                      <label key={w.id}>
                        <input type="checkbox" checked={picked.includes(w.id)} onChange={() => toggle(w.id)} />
                        <Avatar name={name} src={w.profilePhotoUrl} />
                        <strong>{name}</strong>
                        <span />
                      </label>
                    );
                  })}
                </div>
              )
            )}

            <div className="ag-field">
              <span>Plantillas</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.title}
                    className="ag-chip"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setTitle(t.title);
                      setBody(t.body);
                    }}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <label className="ag-field">
              <span>Título</span>
              <input className="ag-input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="ag-field">
              <span>Mensaje</span>
              <textarea className="ag-textarea" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
              <small>{body.length}/500</small>
            </label>

            {error && <ErrorNote message={error} />}

            <div>
              <button className="ag-btn ag-btn-primary" disabled={!valid || sending} onClick={submit}>
                <Send />
                {sending
                  ? 'Enviando…'
                  : count === 1
                    ? 'Enviar a 1 trabajador'
                    : `Enviar a ${count} trabajadores`}
              </button>
            </div>
          </div>
        </section>

        <section className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <h2>Enviados</h2>
            </div>
          </div>
          {history.error && (
            <div className="ag-panel-body">
              <ErrorNote message={history.error} onRetry={() => history.reload()} />
            </div>
          )}
          {history.loading && !history.data ? (
            <SkeletonRows rows={3} />
          ) : (history.data ?? []).length === 0 ? (
            <Empty title="Todavía no enviaste avisos" />
          ) : (
            <ul className="ag-rows">
              {history.data!.map((m) => (
                <li key={m.id} className="ag-row" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                  <div className="ag-row-main">
                    <div className="ag-row-title">{m.title}</div>
                    <p style={{ margin: '2px 0 6px', color: 'var(--ink-2)' }}>{m.body}</p>
                    <div className="ag-row-sub">
                      <span>{dateTime(m.createdAt)}</span>
                      <span>
                        {m.recipients === 1 ? '1 trabajador' : `${m.recipients} trabajadores`}
                      </span>
                      <span title="Celulares que recibieron la notificación">
                        <BellRing /> {m.pushed} {m.pushed === 1 ? 'celular' : 'celulares'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
