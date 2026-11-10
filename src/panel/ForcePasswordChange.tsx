import { useState, type CSSProperties, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import * as agencyApi from '../lib/agency-api';
import { useAuth } from '../context/AuthContext';

/**
 * Pantalla obligatoria cuando la agencia entra con la contraseña que le
 * puso el admin de Chamba: no deja usar el panel hasta poner una propia.
 */
export default function ForcePasswordChange() {
  const { agency, logout, markPasswordChanged } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword) return setError('Escribe la contraseña que te dieron.');
    if (newPassword.length < 8) {
      return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Las contraseñas nuevas no coinciden.');
    }
    if (newPassword === currentPassword) {
      return setError('Elige una contraseña distinta de la que te dieron.');
    }
    setSaving(true);
    try {
      await agencyApi.changePassword(currentPassword, newPassword);
      markPasswordChanged();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join('. ')
          : typeof message === 'string'
            ? message
            : 'No se pudo cambiar la contraseña.',
      );
    } finally {
      setSaving(false);
    }
  };

  const input: CSSProperties = {
    width: '100%',
    marginTop: 6,
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid #E6E2F0',
    background: '#F7F6FC',
    fontSize: 14,
    color: '#17132D',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const label: CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#3F3A56',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#13101D',
        padding: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          borderRadius: 28,
          padding: 32,
          color: '#17132D',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: '#F1EBFF',
            color: '#6D28D9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <KeyRound size={24} />
        </div>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0 }}>Crea tu contraseña</h1>
        <p style={{ fontSize: 14, color: '#6B6584', margin: '6px 0 22px', lineHeight: 1.45 }}>
          {agency?.name ? `${agency.name}, entraste` : 'Entraste'} con la contraseña que te dio
          Chamba. Antes de usar el panel, cámbiala por una propia.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={label}>
            Contraseña actual
            <input
              type={show ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              style={input}
            />
          </label>
          <label style={label}>
            Nueva contraseña
            <input
              type={show ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Al menos 8 caracteres"
              style={input}
            />
          </label>
          <label style={label}>
            Repite la nueva contraseña
            <input
              type={show ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={input}
            />
          </label>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#6D28D9',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
            {show ? 'Ocultar contraseñas' : 'Ver contraseñas'}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              marginTop: 16,
              background: '#FCEBEB',
              color: '#A32D2D',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: 14,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: 22,
            width: '100%',
            padding: '13px 0',
            borderRadius: 16,
            border: 'none',
            background: '#6D28D9',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Guardando…' : 'Guardar y entrar'}
        </button>
        <button
          type="button"
          onClick={logout}
          style={{
            marginTop: 12,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: '#6B6584',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} /> Salir
        </button>
      </form>
    </div>
  );
}
