import { io, Socket } from 'socket.io-client';

function getSocketOrigin(): string {
  const socketUrl = import.meta.env.VITE_SOCKET_URL;
  if (socketUrl && typeof socketUrl === 'string' && socketUrl.trim() !== '') {
    return socketUrl.trim().replace(/\/+$/, '');
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim() !== '') {
    return apiUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  }
  return 'http://localhost:3000';
}

const SOCKET_ORIGIN = getSocketOrigin();

// Eventos que emite el backend sobre ofertas de los workers de la agencia.
export const AGENCY_EVENTS = [
  'offer.accepted',
  'offer.rejected',
  'offer.updated',
  'offer.expired',
  'request.status.updated',
  'request.published',
] as const;

export type AgencyRealtimeEvent = (typeof AGENCY_EVENTS)[number];

let socket: Socket | null = null;
const joinedWorkerRooms = new Set<string>();

function getSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_ORIGIN}/realtime`, {
      transports: ['websocket'],
      reconnectionDelayMax: 10000,
    });
    // Al reconectar hay que volver a unirse a las salas de cada worker.
    socket.on('connect', () => {
      for (const workerId of joinedWorkerRooms) {
        socket?.emit('join.user', { userId: workerId });
      }
    });
  }
  return socket;
}

/**
 * El panel se une a la sala de cada trabajador de la agencia; así recibe los
 * mismos eventos de oferta (aceptada/rechazada/expirada) que la app móvil,
 * sin cambios en el gateway del backend.
 */
export function joinWorkerRooms(workerIds: string[]): void {
  const s = getSocket();
  for (const workerId of workerIds) {
    if (!joinedWorkerRooms.has(workerId)) {
      joinedWorkerRooms.add(workerId);
      s.emit('join.user', { userId: workerId });
    }
  }
}

export function subscribeAgencyEvents(
  handler: (event: AgencyRealtimeEvent, payload: any) => void,
): () => void {
  const s = getSocket();
  const listeners = AGENCY_EVENTS.map((event) => {
    const listener = (payload: any) => handler(event, payload);
    s.on(event, listener);
    return { event, listener };
  });
  return () => {
    for (const { event, listener } of listeners) {
      s.off(event, listener);
    }
  };
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
  joinedWorkerRooms.clear();
}
