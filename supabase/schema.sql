-- =============================================
-- G-CITY Database Schema
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. PROFILES (extiende auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text,
  telefono text,
  email text,
  direccion text,
  ciudad text,
  departamento text,
  rol text default 'cliente' check (rol in ('cliente', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-crear profile cuando un user se registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS para profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- 2. PRODUCTOS
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_cop bigint not null,
  precio_usd numeric(10,2),
  categoria text not null,
  subcategoria text,
  imagenes text[] default '{}',
  stock int default 0,
  tipo text not null default 'propio' check (tipo in ('propio', 'dropship')),
  fuente text,
  fuente_url text,
  fuente_precio_usd numeric(10,2),
  peso_lb numeric(6,2),
  arancel_pct int default 0,
  activo boolean default true,
  destacado boolean default false,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS para productos: lectura pública, escritura solo admin
alter table public.productos enable row level security;

create policy "Anyone can view active products"
  on public.productos for select
  using (activo = true);

create policy "Admins can view all products"
  on public.productos for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Admins can insert products"
  on public.productos for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Admins can update products"
  on public.productos for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Admins can delete products"
  on public.productos for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- 3. PEDIDOS
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  estado text default 'pendiente' check (estado in (
    'pendiente','pagado','comprando','en_transito',
    'en_bodega','enviado','entregado','cancelado'
  )),
  total_cop bigint not null,
  metodo_pago text,
  referencia_pago text,
  direccion_envio text,
  ciudad text,
  departamento text,
  notas text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pedidos enable row level security;

create policy "Users can view own orders"
  on public.pedidos for select
  using (auth.uid() = user_id);

create policy "Admins can view all orders"
  on public.pedidos for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Users can create orders"
  on public.pedidos for insert
  with check (auth.uid() = user_id);

create policy "Admins can update orders"
  on public.pedidos for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- 4. PEDIDO ITEMS
create table if not exists public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id),
  cantidad int default 1,
  precio_unitario_cop bigint,
  subtotal_cop bigint
);

alter table public.pedido_items enable row level security;

create policy "Users can view own order items"
  on public.pedido_items for select
  using (
    exists (
      select 1 from public.pedidos
      where id = pedido_id and user_id = auth.uid()
    )
  );

create policy "Admins can view all order items"
  on public.pedido_items for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

create policy "Users can create order items"
  on public.pedido_items for insert
  with check (
    exists (
      select 1 from public.pedidos
      where id = pedido_id and user_id = auth.uid()
    )
  );

-- 5. SUGERENCIAS DEL BOT (para milestones futuros)
create table if not exists public.sugerencias_bot (
  id uuid primary key default gen_random_uuid(),
  fuente text not null,
  nombre_producto text,
  url_fuente text,
  url_proveedor text,
  precio_estimado_usd numeric(10,2),
  precio_estimado_cop bigint,
  razon text,
  score_viralidad int,
  estado text default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  created_at timestamptz default now()
);

alter table public.sugerencias_bot enable row level security;

create policy "Admins can manage suggestions"
  on public.sugerencias_bot for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

-- 6. STORAGE: crear bucket para imágenes de productos
-- NOTA: Esto se hace desde el dashboard de Supabase:
-- Storage → New bucket → nombre: "productos" → Public: ON
-- No se puede crear buckets via SQL estándar.

-- 7. ÍNDICES para performance
create index if not exists idx_productos_activo on public.productos(activo);
create index if not exists idx_productos_categoria on public.productos(categoria);
create index if not exists idx_productos_tipo on public.productos(tipo);
create index if not exists idx_productos_destacado on public.productos(destacado);
create index if not exists idx_pedidos_user on public.pedidos(user_id);
create index if not exists idx_pedidos_estado on public.pedidos(estado);
