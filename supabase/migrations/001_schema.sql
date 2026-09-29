-- Marmitaria — schema inicial
-- Cada tabela tem user_id preenchido automaticamente e RLS restringindo ao dono.

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  categoria text,
  unidade text not null default 'g' check (unidade in ('g', 'ml', 'un')),
  embalagem numeric not null default 1000 check (embalagem > 0),
  kcal numeric not null default 0,
  prot numeric not null default 0,
  carb numeric not null default 0,
  gord numeric not null default 0,
  criado_em timestamptz not null default now()
);

create table public.precos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  produto_id uuid not null references public.produtos on delete cascade,
  preco numeric(10, 2) not null check (preco >= 0),
  data date not null default current_date,
  mercado text,
  criado_em timestamptz not null default now()
);

create table public.marmitas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  porcoes int not null default 1 check (porcoes > 0),
  preparo text,
  criado_em timestamptz not null default now()
);

create table public.marmita_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  marmita_id uuid not null references public.marmitas on delete cascade,
  produto_id uuid not null references public.produtos on delete restrict,
  quantidade numeric not null check (quantidade > 0)
);

create table public.cardapio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  data date not null,
  refeicao text not null default 'almoco' check (refeicao in ('cafe', 'almoco', 'lanche', 'jantar')),
  marmita_id uuid not null references public.marmitas on delete cascade,
  porcoes numeric not null default 1 check (porcoes > 0)
);

create index on public.produtos (user_id);
create index on public.precos (produto_id, data desc);
create index on public.marmitas (user_id);
create index on public.marmita_itens (marmita_id);
create index on public.marmita_itens (produto_id);
create index on public.cardapio (user_id, data);
create index on public.cardapio (marmita_id);

do $$
declare t text;
begin
  foreach t in array array['produtos', 'precos', 'marmitas', 'marmita_itens', 'cardapio'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
