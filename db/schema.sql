-- Esquema de "Mis gastos".
-- Ejecútalo una vez en el SQL Editor de Neon (Dashboard → SQL Editor → pegar → Run).
-- Es idempotente: puedes ejecutarlo varias veces sin romper nada.

create table if not exists transactions (
  id               bigint generated always as identity primary key,
  amount           numeric(12, 2) not null,                 -- en euros; negativo = devolución
  merchant         text not null,                           -- nombre tal y como llega
  merchant_key     text not null,                           -- nombre normalizado (para reglas y duplicados)
  card             text,                                    -- tarjeta (opcional)
  category         text not null default 'otros',
  category_source  text not null default 'fallback',        -- explicit | rule | keyword | ai | fallback | user
  source           text not null default 'applepay',        -- applepay | manual
  paid_at          timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint transactions_source_chk check (source in ('applepay', 'manual')),
  constraint transactions_category_chk check (category in (
    'padel', 'supermercado', 'restaurantes', 'gasolina', 'transporte', 'deporte',
    'ocio', 'compras', 'ropa', 'suscripciones', 'salud', 'hogar', 'viajes',
    'belleza', 'regalos', 'educacion', 'otros'
  ))
);

create index if not exists transactions_paid_at_idx on transactions (paid_at desc);
create index if not exists transactions_merchant_key_idx on transactions (merchant_key, paid_at desc);

-- Una regla por comercio (nombre normalizado). Se crea sola al clasificar
-- y se sobrescribe cuando tú cambias la categoría desde la web (source = 'user').
create table if not exists merchant_rules (
  merchant_key  text primary key,
  merchant      text not null,                              -- último nombre visto, para mostrarlo
  category      text not null,
  source        text not null,                              -- user | explicit | keyword | ai
  updated_at    timestamptz not null default now(),
  constraint merchant_rules_source_chk check (source in ('user', 'explicit', 'keyword', 'ai')),
  constraint merchant_rules_category_chk check (category in (
    'padel', 'supermercado', 'restaurantes', 'gasolina', 'transporte', 'deporte',
    'ocio', 'compras', 'ropa', 'suscripciones', 'salud', 'hogar', 'viajes',
    'belleza', 'regalos', 'educacion', 'otros'
  ))
);
