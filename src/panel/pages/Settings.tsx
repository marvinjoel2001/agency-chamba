import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { changePassword, getSettings, updateSettings } from '../../lib/agency-api';
import { ErrorNote, PageHead, errorText, money, rate, useLoad, useToast } from '../ui';

export default function Settings() {
  const toast = useToast();
  const settings = useLoad(() => getSettings());
  const [workerRate, setWorkerRate] = useState('');
  const [savingRate, setSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setWorkerRate(String(settings.data.workerCommissionRate));
  }, [settings.data]);

  const numeric = Number(workerRate);
  const rateValid = workerRate !== '' && numeric >= 0 && numeric <= 100;
  const chambaRate = settings.data?.chambaCommissionRate ?? 0;

  const saveRate = async () => {
    setSavingRate(true);
    setRateError(null);
    try {
      settings.setData(await updateSettings({ workerCommissionRate: numeric }));
      toast('Comisión general guardada.');
    } catch (err) {
      setRateError(errorText(err, 'No pudimos guardar la comisión.'));
    } finally {
      setSavingRate(false);
    }
  };

  const savePassword = async () => {
    setSavingPass(true);
    setPassError(null);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      toast('Contraseña del panel cambiada.');
    } catch (err) {
      setPassError(errorText(err, 'No pudimos cambiar la contraseña.'));
    } finally {
      setSavingPass(false);
    }
  };

  // Ejemplo con un trabajo de Bs 100.
  const sample = 100;
  const agencyPart = (sample * (rateValid ? numeric : 0)) / 100;
  const chambaPart = (sample * chambaRate) / 100;

  return (
    <>
      <PageHead title="Ajustes" intro="Comisiones de tu agencia y acceso al panel." />
      {settings.error && <ErrorNote message={settings.error} onRetry={() => settings.reload()} />}

      <div className="ag-cols">
        <div className="ag-stack">
          <section className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <h2>Comisión a tus trabajadores</h2>
                <p>
                  Lo que tu agencia se queda de cada trabajo. Puedes poner una distinta a un trabajador desde Mi flota.
                </p>
              </div>
            </div>
            <div className="ag-panel-body" style={{ display: 'grid', gap: 14 }}>
              <label className="ag-field" style={{ maxWidth: 220 }}>
                <span>Comisión general</span>
                <div className="ag-input-affix">
                  <em>
                    <Percent size={15} />
                  </em>
                  <input
                    className="ag-input"
                    inputMode="decimal"
                    value={workerRate}
                    onChange={(e) => setWorkerRate(e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </div>
              </label>

              <div className="ag-panel" style={{ padding: '12px 16px' }}>
                <div className="ag-hint" style={{ marginBottom: 6 }}>
                  En un trabajo de {money(sample)}:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', rowGap: 4 }}>
                  <span>Tu trabajador recibe</span>
                  <strong>{money(sample - agencyPart)}</strong>
                  <span>Tu agencia se queda</span>
                  <strong>{money(agencyPart)}</strong>
                  <span>De eso, comisión de Chamba ({rate(chambaRate)} del trabajo)</span>
                  <strong>{money(chambaPart)}</strong>
                  <span>Te queda limpio</span>
                  <strong style={{ color: agencyPart - chambaPart < 0 ? 'var(--red)' : 'var(--green)' }}>
                    {money(agencyPart - chambaPart)}
                  </strong>
                </div>
              </div>
              {rateValid && agencyPart < chambaPart && (
                <p className="ag-hint" style={{ color: 'var(--red)', margin: 0 }}>
                  Con esta comisión pierdes dinero en cada trabajo: la de Chamba es mayor.
                </p>
              )}
              {rateError && <ErrorNote message={rateError} />}
              <div>
                <button
                  className="ag-btn ag-btn-primary"
                  disabled={!rateValid || savingRate || numeric === settings.data?.workerCommissionRate}
                  onClick={saveRate}
                >
                  {savingRate ? 'Guardando…' : 'Guardar comisión'}
                </button>
              </div>
              <p className="ag-hint" style={{ margin: 0 }}>
                El cambio aplica a los trabajos que se terminen desde ahora; los ya terminados no cambian.
              </p>
            </div>
          </section>
        </div>

        <div className="ag-stack">
          <section className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <h2>Tu agencia</h2>
              </div>
            </div>
            <div className="ag-panel-body" style={{ display: 'grid', gap: 10 }}>
              <div>
                <div className="ag-hint">Nombre</div>
                <strong>{settings.data?.name ?? '—'}</strong>
              </div>
              <div>
                <div className="ag-hint">Correo de acceso</div>
                <strong>{settings.data?.contactEmail ?? '—'}</strong>
              </div>
              {settings.data?.contactPhone && (
                <div>
                  <div className="ag-hint">Teléfono</div>
                  <strong>{settings.data.contactPhone}</strong>
                </div>
              )}
              <div>
                <div className="ag-hint">Comisión de Chamba</div>
                <strong>{rate(chambaRate)}</strong>
                <div className="ag-hint">La fija Chamba. Para cambiar estos datos escribe a soporte@chamba.app.</div>
              </div>
            </div>
          </section>

          <section className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <h2>Contraseña del panel</h2>
              </div>
            </div>
            <div className="ag-panel-body" style={{ display: 'grid', gap: 12 }}>
              <label className="ag-field">
                <span>Contraseña actual</span>
                <input
                  className="ag-input"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </label>
              <label className="ag-field">
                <span>Contraseña nueva</span>
                <input
                  className="ag-input"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
                <small>Mínimo 6 caracteres.</small>
              </label>
              {passError && <ErrorNote message={passError} />}
              <div>
                <button
                  className="ag-btn ag-btn-quiet"
                  disabled={!current || next.length < 6 || savingPass}
                  onClick={savePassword}
                >
                  {savingPass ? 'Guardando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
