-- SMS2 marketplace schema. user_id is TEXT to match Better Auth ids.

create table if not exists user_profiles (
  user_id text primary key,
  display_name text,
  phone text,
  role text not null default 'customer',
  status text not null default 'active',
  two_factor_enabled boolean not null default false,
  two_factor_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  user_id text primary key,
  granted_at timestamptz not null default now(),
  granted_by text
);

create table if not exists wallets (
  user_id text primary key,
  balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id text primary key,
  user_id text not null,
  type text not null,
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  reference_type text,
  reference_id text,
  description text not null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx on wallet_transactions (user_id, created_at desc);

create table if not exists deposits (
  id text primary key,
  user_id text not null,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  payer_name text,
  payer_phone text,
  reference text not null,
  note text,
  payment_method text not null default 'telecel_momo',
  destination text not null default '0508158717',
  idempotency_key text not null unique,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists deposits_user_idx on deposits (user_id, created_at desc);
create index if not exists deposits_status_idx on deposits (status);

create table if not exists services (
  id text primary key,
  name text not null,
  slug text,
  updated_at timestamptz not null default now()
);

create table if not exists countries (
  id text primary key,
  name text not null,
  iso2 text,
  dial text,
  updated_at timestamptz not null default now()
);

create table if not exists catalogue_offers (
  service_id text not null,
  country_id text not null,
  wholesale_price numeric(12,4) not null,
  stock integer not null default 0,
  available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (service_id, country_id)
);
create index if not exists catalogue_service_idx on catalogue_offers (service_id);
create index if not exists catalogue_country_idx on catalogue_offers (country_id);

create table if not exists orders (
  id text primary key,
  user_id text not null,
  country_id text not null,
  country_name text not null,
  service_id text not null,
  service_name text not null,
  phone_number text,
  customer_price numeric(12,2) not null,
  wholesale_price numeric(12,2) not null,
  status text not null,
  n1sms_order_id text,
  sms_code text,
  expires_at timestamptz,
  idempotency_key text not null unique,
  error_message text,
  provider_mode text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status);

create table if not exists sms_messages (
  id text primary key,
  order_id text not null,
  sender text,
  body text not null,
  code text,
  received_at timestamptz not null default now()
);
create index if not exists sms_order_idx on sms_messages (order_id, received_at desc);

create table if not exists refunds (
  id text primary key,
  order_id text not null,
  user_id text not null,
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  user_id text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata text,
  created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on audit_logs (created_at desc);

create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists provider_status (
  id integer primary key,
  connected boolean not null default false,
  mode text not null default 'disconnected',
  last_ok_at timestamptz,
  last_error text,
  last_check_at timestamptz,
  balance numeric(12,2)
);

insert into settings (key, value) values
  ('markup_multiplier', '1.50'),
  ('currency', 'GHS'),
  ('payment_destination', '0508158717'),
  ('payment_network', 'Telecel Mobile Money')
on conflict (key) do nothing;

insert into provider_status (id, connected, mode)
values (1, false, 'disconnected')
on conflict (id) do nothing;
