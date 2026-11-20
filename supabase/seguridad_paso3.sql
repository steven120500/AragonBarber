-- ═══════════════════════════════════════════════════════════════
-- SEGURIDAD · PASO 3 (solo el admin, no cualquier sesión)
-- Antes, cualquier usuario con sesión ("authenticated") tenía acceso de admin.
-- Como cualquiera puede crearse una cuenta con la llave pública, eso dejaba
-- entrar a desconocidos. Ahora solo los usuarios de la tabla "admins" tienen acceso.
--
-- Supabase → SQL Editor → New query → pegar todo → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── 1) Lista de administradores ───
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- (sin políticas: nadie la puede leer ni modificar desde el sitio, solo desde el SQL Editor)

-- Usuario del panel de admin (Authentication → Users). Para agregar otro admin,
-- insertar su id aquí desde el SQL Editor.
insert into public.admins (user_id)
select id from auth.users where id = '875d73f4-d85a-4c1e-baad-3964c97cd0bc'
on conflict do nothing;

-- Si esto da error, el id de arriba no coincide con ningún usuario: corrígelo.
do $$
begin
  if not exists (select 1 from public.admins) then
    raise exception 'No hay ningún admin registrado: revisa el id del paso 1';
  end if;
end $$;

-- ¿El usuario con sesión es admin?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to anon, authenticated;


-- ─── 2) CITAS ───
-- El público sigue pudiendo crear citas pendientes ("Publico crea citas pendientes").
drop policy if exists "Admin controla citas" on public.citas;
create policy "Admin controla citas"
  on public.citas for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 3) PRODUCTOS ───
drop policy if exists "Admin gestiona productos" on public.productos;
create policy "Admin gestiona productos"
  on public.productos for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 4) HORARIOS BLOQUEADOS ───
drop policy if exists "Admin gestiona horarios" on public.horarios_bloqueados;
create policy "Admin gestiona horarios"
  on public.horarios_bloqueados for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 5) RESEÑAS ───
drop policy if exists "Admin gestiona resenas" on public.resenas;
create policy "Admin gestiona resenas"
  on public.resenas for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 6) TIEMPOS LIBRES ───
drop policy if exists "Admin gestiona tiempos libres" on public.tiempos_libres;
create policy "Admin gestiona tiempos libres"
  on public.tiempos_libres for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 6b) GASTOS ───
drop policy if exists "Admin controla gastos" on public.gastos;
create policy "Admin controla gastos"
  on public.gastos for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 7) VENTAS DE PRODUCTOS ───
drop policy if exists "ventas: solo autenticados" on public.ventas_productos;
drop policy if exists "ventas: solo admin"        on public.ventas_productos;
create policy "ventas: solo admin"
  on public.ventas_productos for all
  to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ─── 8) FOTOS DE PRODUCTOS (Storage) ───
drop policy if exists "Admin sube imagenes de productos"      on storage.objects;
drop policy if exists "Admin borra imagenes de productos"     on storage.objects;
drop policy if exists "Admin actualiza imagenes de productos" on storage.objects;

create policy "Admin sube imagenes de productos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos' and public.es_admin());

create policy "Admin borra imagenes de productos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos' and public.es_admin());

create policy "Admin actualiza imagenes de productos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos' and public.es_admin());


-- ═══════════════════════════════════════════════════════════════
-- REVISIÓN (correr después y mirar los resultados)
-- ═══════════════════════════════════════════════════════════════

-- A) Usuarios que existen. Si aparece alguien que NO eres tú, alguien se registró:
--    bórralo en Authentication → Users.
select id, email, created_at, last_sign_in_at from auth.users order by created_at;

-- B) Políticas que todavía dejan pasar a cualquier sesión sin revisar es_admin().
--    Lo ideal es que solo salga "Publico crea citas pendientes" (y las de solo lectura públicas).
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and 'authenticated' = any (roles)
  and coalesce(qual, '') not like '%es_admin%'
  and coalesce(with_check, '') not like '%es_admin%';
