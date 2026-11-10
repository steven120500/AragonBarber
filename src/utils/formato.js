// Formato de colones: 15000 → "₡15 000"
export const formatearPrecio = (valor) => `₡${(Number(valor) || 0).toLocaleString('es-CR')}`;

// "2026-11-12" → Date local (sin desfase por zona horaria)
const aFechaLocal = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

// "2026-11-12" → "jue 12 nov"
export const formatearFechaCorta = (iso) => {
  if (!iso) return '';
  return aFechaLocal(iso)
    .toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '');
};

// "2026-11-12" → "Hoy" | "Mañana" | "Ayer" | "jueves 12 de noviembre"
export const formatearFechaRelativa = (iso) => {
  if (!iso) return '';
  const fecha = aFechaLocal(iso);
  const aUTC = (f) => { const [y, m, d] = f.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const dias = Math.round((aUTC(iso) - aUTC(hoyCR())) / 86400000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  const texto = fecha.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// "15:30" o "15:30:00" → "3:30 PM"
export const formatearHora = (hora) => {
  if (!hora) return '';
  const [hStr, min] = hora.split(':');
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
};

// ─── FECHAS EN HORA DE COSTA RICA (evita el desfase de UTC después de las 6 PM) ───
const ZONA_CR = 'America/Costa_Rica';

// Fecha de hoy en Costa Rica: "2026-11-10"
export const hoyCR = () => new Date().toLocaleDateString('en-CA', { timeZone: ZONA_CR });

// Hora actual en Costa Rica: "18:45"
export const horaCR = () => new Date().toLocaleTimeString('en-GB', { timeZone: ZONA_CR, hour: '2-digit', minute: '2-digit' });

// Suma días a una fecha ISO sin tocar zonas horarias: ("2026-11-10", 3) → "2026-11-13"
export const sumarDias = (iso, dias) => {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
};

// Día de la semana de una fecha ISO: 0 = domingo … 6 = sábado
export const diaSemana = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
