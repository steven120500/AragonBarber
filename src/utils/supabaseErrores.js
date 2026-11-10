// ¿El error de Supabase indica que la tabla todavía no existe?
// (42P01 = Postgres "undefined_table", PGRST205 = PostgREST "tabla no encontrada en el esquema")
export const esTablaFaltante = (error) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message || ''));

export const MENSAJE_TABLA_VENTAS =
  'Falta crear la tabla de ventas en Supabase. Abre Supabase → SQL Editor y ejecuta el archivo supabase/ventas_productos.sql (solo una vez).';
