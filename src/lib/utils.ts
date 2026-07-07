export function timeAgo(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return 'Hace un momento';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;

  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

export function formatMoney(amount: number): string {
  return `Bs ${amount.toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fullName(firstName: string, lastName?: string | null): string {
  return `${firstName} ${lastName ?? ''}`.trim();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  expired: 'Expirada',
  active: 'Activa',
};
