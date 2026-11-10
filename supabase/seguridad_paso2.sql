-- ═══════════════════════════════════════════════════════════════
-- SEGURIDAD · PASO 2 (cierra los permisos)
-- Ejecutar DESPUÉS de publicar la nueva versión del sitio
-- (la versión vieja leía la tabla de citas directamente y dejaría de reservar).
-- Supabase → SQL Editor → New query → pegar todo → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── CITAS ───
-- El público solo puede CREAR citas pendientes. Leer horarios y cancelar
-- se hace por las funciones seguras del paso 1. El admin conserva todo.
drop policy if exists "Permitir leer citas al publico"     on public.citas;
drop policy if exists "Permitir publico actualizar citas"  on public.citas;
drop policy if exists "Permitir publico borrar citas"      on public.citas;
drop policy if exists "Permitir crear citas al publico"    on public.citas;

create policy "Publico crea citas pendientes"
  on public.citas for insert
  to anon, authenticated
  with check (estado = 'pendiente');
-- (se mantiene "Admin controla citas" para authenticated)


-- ─── PRODUCTOS ───
-- Todos pueden VER; solo el admin con sesión puede crear, editar y borrar.
drop policy if exists "Admin puede actualizar productos" on public.productos;
drop policy if exists "Admin puede eliminar productos"   on public.productos;
drop policy if exists "Admin puede insertar productos"   on public.productos;

create policy "Admin gestiona productos"
  on public.productos for all
  to authenticated
  using (true) with check (true);
-- (se mantiene "Productos visibles para todos" para SELECT)


-- ─── HORARIOS BLOQUEADOS ───
alter table public.horarios_bloqueados enable row level security;

drop policy if exists "Horarios visibles para todos" on public.horarios_bloqueados;
drop policy if exists "Admin gestiona horarios"      on public.horarios_bloqueados;

create policy "Horarios visibles para todos"
  on public.horarios_bloqueados for select
  to anon, authenticated
  using (true);

create policy "Admin gestiona horarios"
  on public.horarios_bloqueados for all
  to authenticated
  using (true) with check (true);


-- ─── RESEÑAS ───
alter table public.resenas enable row level security;

drop policy if exists "Resenas publicadas visibles" on public.resenas;
drop policy if exists "Admin gestiona resenas"      on public.resenas;

create policy "Resenas publicadas visibles"
  on public.resenas for select
  to anon
  using (publicado = true);

create policy "Admin gestiona resenas"
  on public.resenas for all
  to authenticated
  using (true) with check (true);


-- ─── TIEMPOS LIBRES (no se usa en el sitio: solo el admin) ───
alter table public.tiempos_libres enable row level security;

drop policy if exists "Admin gestiona tiempos libres" on public.tiempos_libres;

create policy "Admin gestiona tiempos libres"
  on public.tiempos_libres for all
  to authenticated
  using (true) with check (true);


-- ─── FOTOS DE PRODUCTOS (Storage, bucket "productos") ───
-- Todos pueden VER las fotos; solo el admin con sesión puede subir, reemplazar o borrar.
drop policy if exists "Subir imagenes de productos"      on storage.objects;
drop policy if exists "Borrar imagenes de productos"     on storage.objects;
drop policy if exists "Actualizar imagenes de productos" on storage.objects;

create policy "Admin sube imagenes de productos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'productos');

create policy "Admin borra imagenes de productos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'productos');

create policy "Admin actualiza imagenes de productos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'productos');
-- (se mantiene "Ver imagenes de productos" para todos)
