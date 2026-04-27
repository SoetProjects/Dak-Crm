-- ================================================================
-- DakCRM – Initieel databaseschema
-- Multi-tenant dakdekkers ERP/SaaS
-- Voer dit uit via: Supabase Dashboard → SQL Editor
-- ================================================================

-- Extensies
create extension if not exists "uuid-ossp";

-- ================================================================
-- Enums
-- ================================================================

create type user_role as enum ('ADMIN', 'OFFICE', 'FIELD_WORKER');
create type lead_status as enum ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');
create type request_type as enum ('LEAK', 'RENOVATION', 'INSPECTION', 'MAINTENANCE', 'NEW_BUILD', 'OTHER');
create type quote_status as enum ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
create type job_type as enum ('LEAK', 'BITUMEN_ROOF', 'ROOF_RENOVATION', 'INSPECTION', 'MAINTENANCE', 'NEW_BUILD', 'OTHER');
create type job_status as enum ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
create type invoice_status as enum ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
create type planning_item_type as enum ('JOB', 'MEETING', 'ABSENCE', 'TRAINING', 'OTHER');
create type time_entry_type as enum ('WORK', 'TRAVEL', 'BREAK');
create type material_unit as enum ('M2', 'M', 'PIECE', 'KG', 'L', 'HOUR', 'SET');
create type integration_provider as enum ('EXACT', 'SNELSTART', 'MONEYBIRD', 'TWINFIELD', 'AFAS', 'OTHER');
create type integration_status as enum ('ACTIVE', 'INACTIVE', 'ERROR');

-- ================================================================
-- companies
-- ================================================================

create table companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  kvk_number  text,
  vat_number  text,
  address     text,
  city        text,
  phone       text,
  email       text,
  website     text,
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ================================================================
-- users
-- ================================================================

create table users (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  supabase_id  uuid unique,
  email        text not null unique,
  first_name   text not null,
  last_name    text not null,
  phone        text,
  role         user_role not null,
  is_active    boolean not null default true,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index users_company_role_idx on users(company_id, role);

-- ================================================================
-- customers
-- ================================================================

create table customers (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references companies(id) on delete cascade,
  name             text not null,
  contact_person   text,
  phone            text,
  email            text,
  billing_address  text,
  billing_city     text,
  billing_zip      text,
  service_address  text,
  service_city     text,
  service_zip      text,
  kvk_number       text,
  vat_number       text,
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index customers_company_name_idx on customers(company_id, name);

-- ================================================================
-- leads
-- ================================================================

create table leads (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  customer_id   uuid references customers(id) on delete set null,
  name          text not null,
  phone         text,
  email         text,
  address       text,
  city          text,
  request_type  request_type not null,
  status        lead_status not null default 'NEW',
  notes         text,
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index leads_company_status_idx on leads(company_id, status);
create index leads_company_created_idx on leads(company_id, created_at desc);

-- ================================================================
-- quotes
-- ================================================================

create table quotes (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete restrict,
  lead_id       uuid references leads(id) on delete set null,
  quote_number  text not null,
  status        quote_status not null default 'DRAFT',
  subject       text,
  notes         text,
  valid_until   date,
  total_amount  numeric(12,2) not null default 0,
  vat_amount    numeric(12,2) not null default 0,
  vat_rate      numeric(5,2) not null default 21,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(company_id, quote_number)
);

create index quotes_company_status_idx on quotes(company_id, status);

create table quote_lines (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null,
  quote_id     uuid not null references quotes(id) on delete cascade,
  description  text not null,
  quantity     numeric(12,2) not null,
  unit         text not null default 'st',
  unit_price   numeric(12,2) not null,
  total        numeric(12,2) not null,
  vat_rate     numeric(5,2) not null default 21,
  sort_order   int not null default 0
);

create index quote_lines_quote_idx on quote_lines(company_id, quote_id);

-- ================================================================
-- jobs (werkbonnen)
-- ================================================================

create table jobs (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete restrict,
  quote_id        uuid references quotes(id) on delete set null,
  job_number      text,
  title           text not null,
  description     text,
  address         text,
  city            text,
  job_type        job_type not null,
  status          job_status not null default 'PLANNED',
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  actual_start    timestamptz,
  actual_end      timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index jobs_company_status_idx on jobs(company_id, status);
create index jobs_company_scheduled_idx on jobs(company_id, scheduled_start);

create table job_assignments (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null,
  job_id       uuid not null references jobs(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  assigned_at  timestamptz not null default now(),
  is_lead      boolean not null default false,
  unique(job_id, user_id)
);

create index job_assignments_company_user_idx on job_assignments(company_id, user_id);
create index job_assignments_company_job_idx  on job_assignments(company_id, job_id);

create table job_notes (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null,
  job_id      uuid not null references jobs(id) on delete cascade,
  author_id   uuid not null references users(id) on delete restrict,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index job_notes_job_idx on job_notes(company_id, job_id, created_at desc);

create table job_photos (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null,
  job_id          uuid not null references jobs(id) on delete cascade,
  uploaded_by_id  uuid references users(id) on delete set null,
  file_key        text not null,
  file_url        text,
  caption         text,
  taken_at        timestamptz,
  created_at      timestamptz not null default now()
);

create index job_photos_job_idx on job_photos(company_id, job_id, created_at desc);

-- ================================================================
-- planning_items
-- ================================================================

create table planning_items (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  job_id       uuid references jobs(id) on delete set null,
  user_id      uuid references users(id) on delete set null,
  type         planning_item_type not null default 'JOB',
  title        text not null,
  description  text,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  all_day      boolean not null default false,
  color        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index planning_items_company_start_idx  on planning_items(company_id, start_at);
create index planning_items_user_start_idx     on planning_items(company_id, user_id, start_at);

-- ================================================================
-- time_entries (uurregistraties)
-- ================================================================

create table time_entries (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references companies(id) on delete cascade,
  job_id      uuid not null references jobs(id) on delete cascade,
  user_id     uuid not null references users(id) on delete restrict,
  type        time_entry_type not null default 'WORK',
  started_at  timestamptz not null,
  ended_at    timestamptz,
  minutes     int,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index time_entries_job_idx  on time_entries(company_id, job_id);
create index time_entries_user_idx on time_entries(company_id, user_id, started_at desc);

-- ================================================================
-- materials (materiaalkatalogus)
-- ================================================================

create table materials (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  name         text not null,
  description  text,
  sku          text,
  unit         material_unit not null default 'PIECE',
  cost_price   numeric(12,2),
  sales_price  numeric(12,2),
  vat_rate     numeric(5,2) not null default 21,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index materials_company_name_idx on materials(company_id, name);

create table job_materials (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null,
  job_id       uuid not null references jobs(id) on delete cascade,
  material_id  uuid references materials(id) on delete set null,
  description  text not null,
  quantity     numeric(12,2) not null,
  unit         text not null default 'st',
  unit_cost    numeric(12,2) not null default 0,
  unit_price   numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  used_at      date,
  created_at   timestamptz not null default now()
);

create index job_materials_job_idx on job_materials(company_id, job_id);

-- ================================================================
-- invoices (facturen)
-- ================================================================

create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references companies(id) on delete cascade,
  customer_id     uuid not null references customers(id) on delete restrict,
  job_id          uuid references jobs(id) on delete set null,
  quote_id        uuid references quotes(id) on delete set null,
  invoice_number  text not null,
  status          invoice_status not null default 'DRAFT',
  subject         text,
  notes           text,
  invoice_date    date not null default current_date,
  due_date        date,
  paid_at         timestamptz,
  total_amount    numeric(12,2) not null default 0,
  vat_amount      numeric(12,2) not null default 0,
  external_ref    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(company_id, invoice_number)
);

create index invoices_company_status_idx   on invoices(company_id, status);
create index invoices_company_due_idx      on invoices(company_id, due_date);

create table invoice_lines (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null,
  invoice_id   uuid not null references invoices(id) on delete cascade,
  description  text not null,
  quantity     numeric(12,2) not null,
  unit         text not null default 'st',
  unit_price   numeric(12,2) not null,
  total        numeric(12,2) not null,
  vat_rate     numeric(5,2) not null default 21,
  sort_order   int not null default 0
);

create index invoice_lines_invoice_idx on invoice_lines(company_id, invoice_id);

-- ================================================================
-- integrations (boekhoudkoppelingen)
-- ================================================================

create table integrations (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references companies(id) on delete cascade,
  provider       integration_provider not null,
  status         integration_status not null default 'INACTIVE',
  access_token   text,
  refresh_token  text,
  token_expiry   timestamptz,
  settings       jsonb,
  last_sync_at   timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(company_id, provider)
);

create index integrations_company_status_idx on integrations(company_id, status);

-- ================================================================
-- updated_at trigger (auto-update)
-- ================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to all tables with updated_at
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies','users','customers','leads','quotes','jobs',
    'job_notes','planning_items','time_entries','materials',
    'invoices','integrations'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %s
       for each row execute function set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- ================================================================
-- Row Level Security – policies uitgeschakeld voor nu
-- Enable per-table wanneer Supabase auth volledig is ingericht:
--
--   alter table companies enable row level security;
--   create policy "company_isolation" on companies
--     using (id = (select company_id from users where supabase_id = auth.uid()));
-- ================================================================

-- Klaar – voer prisma migrate deploy uit voor Prisma-migraties.
