// ─── FUENTE ÚNICA DE SERVICIOS, PRECIOS Y HORARIO ───
// Si cambias un precio o una duración, cámbialo solo aquí: lo usan la página de reservas,
// la agenda (cobro y plan mensual) y el cálculo de horarios disponibles.

export const SERVICIOS = [
  { id: 'Corte', nombre: 'Corte', duracion: 60, precio: 4000 },
  { id: 'Barba', nombre: 'Barba', duracion: 30, precio: 2000 },
  { id: 'Combo', nombre: 'Corte y Barba', duracion: 60, precio: 6000 },
];

export const HORA_APERTURA = 8;   // 8:00 AM
export const HORA_CIERRE = 20;    // 8:00 PM (la última cita debe terminar a esta hora)
export const INICIO_TARDE = 14;   // Desde las 2:00 PM el horario está abierto por defecto
export const INTERVALO_MIN = 30;

const normalizar = (servicio) => (servicio || '').toLowerCase();

// Precio por nombre de servicio (acepta nombres antiguos guardados en la base de datos)
export const precioServicio = (servicio) => {
  const s = normalizar(servicio);
  if (s.includes('corte y barba') || s.includes('combo')) return 6000;
  if (s.includes('barba') && !s.includes('corte')) return 2000;
  return 4000;
};

// Duración en minutos: solo barba dura 30, todo lo demás 60
export const duracionServicio = (servicio) => {
  const s = normalizar(servicio);
  if (s.includes('barba') && !s.includes('corte')) return 30;
  return 60;
};

// "15:30" → 930
export const aMinutos = (hora) => {
  if (!hora) return 0;
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};

// 930 → "15:30"
export const aHora = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// ¿Se cruzan dos rangos [inicioA, finA) y [inicioB, finB)?
export const seCruzan = (inicioA, finA, inicioB, finB) => inicioA < finB && finA > inicioB;
