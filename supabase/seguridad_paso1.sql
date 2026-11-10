-- ═══════════════════════════════════════════════════════════════
-- SEGURIDAD · PASO 1 (no rompe nada: solo agrega)
-- Ejecutar ANTES de publicar la nueva versión del sitio.
-- Supabase → SQL Editor → New query → pegar todo → Run
-- ═══════════════════════════════════════════════════════════════

-- 1) Código secreto por cita para el enlace de cancelación
--    (reemplaza al número de cita, que era fácil de adivinar)
alter table public.citas
  add column if not exists cancel_token uuid not null default gen_random_uuid();

create unique index if not exists citas_cancel_token_idx on public.citas (cancel_token);


-- 2) Horas ocupadas de un día (sin nombres, teléfonos ni correos)
create or replace function public.horas_ocupadas(p_fecha text)
returns table (hora text, servicio text)
language sql
stable
security definer
set search_path = public
as $$
  select c.hora::text, c.servicio::text
  from public.citas c
  where c.fecha::text = p_fecha
    and c.estado <> 'Cancelada';
$$;


-- 3) Autocompletar el nombre de un cliente frecuente por teléfono
--    (devuelve solo nombre y apellido; ya NO expone el correo)
create or replace function public.cliente_por_telefono(p_telefono text)
returns table (cliente_nombre text, apellido text)
language sql
stable
security definer
set search_path = public
as $$
  select c.cliente_nombre::text, c.apellido::text
  from public.citas c
  where length(p_telefono) = 8
    and c.telefono = p_telefono
  order by c.id desc
  limit 1;
$$;


-- 4) Estado de una cita por su código secreto (para la página de cancelar)
create or replace function public.estado_cita(p_token uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.estado::text from public.citas c where c.cancel_token = p_token;
$$;


-- 5) Cancelar una cita por su código secreto
--    No permite cancelar citas ya cobradas. Devuelve el estado final (o null si no existe).
create or replace function public.cancelar_cita(p_token uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  update public.citas
     set estado = 'Cancelada'
   where cancel_token = p_token
     and estado not in ('Completada', 'Cancelada');

  select c.estado::text into v_estado from public.citas c where c.cancel_token = p_token;
  return v_estado;
end;
$$;


-- Permisos para que la página pública pueda llamar estas funciones
grant execute on function public.horas_ocupadas(text)       to anon, authenticated;
grant execute on function public.cliente_por_telefono(text) to anon, authenticated;
grant execute on function public.estado_cita(uuid)          to anon, authenticated;
grant execute on function public.cancelar_cita(uuid)        to anon, authenticated;
