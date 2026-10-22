-- =====================================================================
--  SEJ PARTNERS — BASE DE DATOS DEL DASHBOARD (Supabase / PostgreSQL)
--  Cómo usar: Supabase → SQL Editor → New query → pega TODO → Run.
--  Se puede volver a ejecutar sin perder datos (usa "if not exists").
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Regiones del cuadro de avance (el "orden" define cómo se listan)
create table if not exists public.regiones (
  nombre text primary key,
  orden  int  not null default 0
);

-- Agencia de desembolso -> Región del cuadro
create table if not exists public.agencia_region (
  agencia text primary key,
  region  text not null references public.regiones(nombre)
            on update cascade on delete cascade
);

-- Feriados (no cuentan como días útiles)
create table if not exists public.feriados (
  fecha       date primary key,
  descripcion text
);

-- Cuota (meta) mensual por región — la edita el administrador
create table if not exists public.cuotas (
  periodo date    not null,               -- primer día del mes, ej. 2026-10-01
  region  text    not null references public.regiones(nombre)
            on update cascade on delete cascade,
  cuota   numeric(14,2) not null default 0,
  primary key (periodo, region)
);

-- Meta mensual por supervisor (código de asesor del Excel)
create table if not exists public.metas_supervisor (
  periodo       date not null,
  codigo_asesor text not null,
  meta_monto    numeric(14,2) not null default 0,
  meta_numero   int not null default 0,
  primary key (periodo, codigo_asesor)
);

-- Perfil de cada usuario (el login lo maneja Supabase Auth)
create table if not exists public.perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  usuario       text not null unique,
  nombre        text not null,
  rol           text not null check (rol in ('admin', 'jefe', 'supervisor')),
  codigo_asesor text,                     -- solo supervisores: su CÓDIGO ASESOR del Excel
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

-- Créditos (una fila por fila de la hoja SEJ)
create table if not exists public.creditos (
  id                  bigint generated always as identity primary key,
  periodo             date not null,
  region_asesor       text,
  agencia_asesor      text,
  coordinador         text,
  asesor              text,
  cargo               text,
  meta_monto          numeric,
  meta_numero         numeric,
  observaciones       text,
  dni_cliente         text,
  nombre_cliente      text,
  fecha_registro      date,
  tipo_cliente        text,
  monto_desembolsado  numeric(14,2),
  tipo_credito        text,
  fecha_desembolso    date,
  region_desembolso   text,
  agencia_desembolso  text,
  analista            text,
  cuenta              text,
  operacion           text,
  nro_solicitud       text,
  tea                 numeric,
  resultado_visita    text,
  codigo_asesor       text,
  dni_asesor          text,
  codigo_pyv          text,
  fecha_ingreso       date,
  nuevos              int,
  valido              text,
  sustento            text,
  cargado_en          timestamptz not null default now()
);
create index if not exists creditos_periodo_idx on public.creditos (periodo);
create index if not exists creditos_codigo_idx  on public.creditos (codigo_asesor);

-- Historial de cargas de Excel
create table if not exists public.cargas (
  id        bigint generated always as identity primary key,
  periodo   date not null,
  archivo   text,
  filas     int  not null,
  usuario   uuid default auth.uid(),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES DE APOYO (quién soy y qué rol tengo)
-- ---------------------------------------------------------------------
create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create or replace function public.mi_codigo() returns text
language sql stable security definer set search_path = public as $$
  select upper(trim(codigo_asesor)) from public.perfiles where id = auth.uid() and activo
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() = 'admin', false)
$$;

-- Admin y jefe ven todo
create or replace function public.ve_todo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() in ('admin', 'jefe'), false)
$$;

-- ---------------------------------------------------------------------
-- 3. SEGURIDAD POR FILA (RLS): lo que cada rol puede ver y cambiar
-- ---------------------------------------------------------------------
alter table public.regiones         enable row level security;
alter table public.agencia_region   enable row level security;
alter table public.feriados         enable row level security;
alter table public.cuotas           enable row level security;
alter table public.metas_supervisor enable row level security;
alter table public.perfiles         enable row level security;
alter table public.creditos         enable row level security;
alter table public.cargas           enable row level security;

-- Borra políticas anteriores (para poder re-ejecutar el script)
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('regiones','agencia_region','feriados','cuotas',
                               'metas_supervisor','perfiles','creditos','cargas')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Créditos: supervisor solo los suyos; jefe y admin todos. Solo el admin escribe.
create policy creditos_ver on public.creditos for select to authenticated
  using (public.ve_todo()
         or (public.mi_rol() = 'supervisor' and upper(trim(codigo_asesor)) = public.mi_codigo()));
create policy creditos_admin_ins on public.creditos for insert to authenticated with check (public.es_admin());
create policy creditos_admin_upd on public.creditos for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy creditos_admin_del on public.creditos for delete to authenticated using (public.es_admin());

-- Tablas de configuración: todos los usuarios activos leen, solo el admin escribe
create policy regiones_ver on public.regiones for select to authenticated using (public.mi_rol() is not null);
create policy regiones_admin on public.regiones for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy agencias_ver on public.agencia_region for select to authenticated using (public.mi_rol() is not null);
create policy agencias_admin on public.agencia_region for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy feriados_ver on public.feriados for select to authenticated using (public.mi_rol() is not null);
create policy feriados_admin on public.feriados for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy cuotas_ver on public.cuotas for select to authenticated using (public.mi_rol() is not null);
create policy cuotas_admin on public.cuotas for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Metas por supervisor: cada supervisor ve la suya; jefe y admin todas
create policy metas_ver on public.metas_supervisor for select to authenticated
  using (public.ve_todo() or upper(trim(codigo_asesor)) = public.mi_codigo());
create policy metas_admin on public.metas_supervisor for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Perfiles: cada uno ve el suyo; jefe y admin ven todos; solo el admin modifica
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = auth.uid() or public.ve_todo());
create policy perfiles_admin on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Historial de cargas
create policy cargas_ver on public.cargas for select to authenticated using (public.ve_todo());
create policy cargas_admin on public.cargas for insert to authenticated with check (public.es_admin());

-- ---------------------------------------------------------------------
-- 4. CARGA DEL EXCEL (reemplaza el mes completo en una sola operación)
--    Si algo falla, no se borra nada (todo o nada).
-- ---------------------------------------------------------------------
create or replace function public.cargar_creditos(p_periodo date, p_archivo text, p_filas jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede cargar data';
  end if;

  delete from public.creditos where periodo = p_periodo;

  insert into public.creditos (
    periodo, region_asesor, agencia_asesor, coordinador, asesor, cargo, meta_monto, meta_numero,
    observaciones, dni_cliente, nombre_cliente, fecha_registro, tipo_cliente, monto_desembolsado,
    tipo_credito, fecha_desembolso, region_desembolso, agencia_desembolso, analista, cuenta,
    operacion, nro_solicitud, tea, resultado_visita, codigo_asesor, dni_asesor, codigo_pyv,
    fecha_ingreso, nuevos, valido, sustento)
  select
    p_periodo, r.region_asesor, r.agencia_asesor, r.coordinador, r.asesor, r.cargo, r.meta_monto, r.meta_numero,
    r.observaciones, r.dni_cliente, r.nombre_cliente, r.fecha_registro, r.tipo_cliente, r.monto_desembolsado,
    r.tipo_credito, r.fecha_desembolso, r.region_desembolso, r.agencia_desembolso, r.analista, r.cuenta,
    r.operacion, r.nro_solicitud, r.tea, r.resultado_visita, r.codigo_asesor, r.dni_asesor, r.codigo_pyv,
    r.fecha_ingreso, r.nuevos, r.valido, r.sustento
  from jsonb_populate_recordset(null::public.creditos, p_filas) as r;

  get diagnostics n = row_count;
  insert into public.cargas (periodo, archivo, filas) values (p_periodo, p_archivo, n);
  return n;
end $$;

revoke execute on function public.cargar_creditos(date, text, jsonb) from public, anon;
grant  execute on function public.cargar_creditos(date, text, jsonb) to authenticated;

-- Último mes con data que el usuario puede ver (respeta RLS)
create or replace function public.ultimo_periodo() returns date
language sql stable as $$
  select max(periodo) from public.creditos
$$;

-- ---------------------------------------------------------------------
-- 5. DATOS INICIALES (tomados de tu script)
-- ---------------------------------------------------------------------
insert into public.regiones (nombre, orden) values
  ('AREQUIPA', 1), ('AYACUCHO', 2), ('CENTRO', 3), ('ORIENTE', 4), ('CAJAMARCA', 5),
  ('CUSCO', 6), ('PUERTO MALDONADO', 7), ('ICA', 8), ('JULIACA', 9), ('TACNA', 10), ('LIMA', 11)
on conflict (nombre) do nothing;

insert into public.agencia_region (agencia, region) values
  ('SIGLO XX','AREQUIPA'), ('ALTO LIBERTAD','AREQUIPA'), ('CAYMA','AREQUIPA'),
  ('CIUDAD MUNICIPAL','AREQUIPA'), ('TENIENTE FERRE','AREQUIPA'), ('YURA','AREQUIPA'),
  ('LA JOYA','AREQUIPA'), ('SOCABAYA','AREQUIPA'),
  ('HUAMANGA','AYACUCHO'), ('HUANTA','AYACUCHO'), ('SAN JUAN BAUTISTA','AYACUCHO'),
  ('CHILCA','CENTRO'), ('CIUDAD UNIVERSITARIA','CENTRO'), ('HUANCAYO-EL TAMBO','CENTRO'), ('REAL','CENTRO'),
  ('TOCACHE','ORIENTE'), ('2 DE MAYO','ORIENTE'), ('IQUITOS','ORIENTE'),
  ('CAJAMARCA','CAJAMARCA'), ('CAJAMARCA II','CAJAMARCA'), ('CELENDIN','CAJAMARCA'), ('CHOTA','CAJAMARCA'),
  ('ICA II','ICA'), ('PISCO','ICA'), ('PARCONA','ICA'),
  ('JULIACA','JULIACA'), ('BOLOGNESI','JULIACA'), ('AZANGARO','JULIACA'), ('HUANCANE','JULIACA'),
  ('LAS MERCEDES','JULIACA'), ('SANDIA','JULIACA'), ('TUPAC AMARU','JULIACA'), ('OVALO VILCAPAZA','JULIACA'),
  ('SANTA ROSA','TACNA'), ('OVALO BALTA','TACNA'), ('PINTO','TACNA'),
  ('ALFREDO MENDIOLA','LIMA'), ('LOS OLIVOS','LIMA')
on conflict (agencia) do nothing;

insert into public.cuotas (periodo, region, cuota) values
  ('2026-10-01','AREQUIPA',600000), ('2026-10-01','AYACUCHO',750000), ('2026-10-01','CENTRO',1000000),
  ('2026-10-01','ORIENTE',300000), ('2026-10-01','CAJAMARCA',800000), ('2026-10-01','CUSCO',750000),
  ('2026-10-01','PUERTO MALDONADO',750000), ('2026-10-01','ICA',300000), ('2026-10-01','JULIACA',1700000),
  ('2026-10-01','TACNA',500000), ('2026-10-01','LIMA',350000)
on conflict (periodo, region) do nothing;

insert into public.feriados (fecha, descripcion) values
  ('2026-10-08', 'Combate de Angamos')
on conflict (fecha) do nothing;
