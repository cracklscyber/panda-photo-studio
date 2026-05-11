-- Personal admin todo list. Single-tenant: shared with whoever has the admin cookie.

create table if not exists public.romy_todos (
  id bigserial primary key,
  title text not null,
  description text,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists romy_todos_done_sort_idx
  on public.romy_todos (done, sort_order, created_at desc);

alter table public.romy_todos enable row level security;

insert into public.romy_todos (title, description, sort_order)
values
  (
    'Fotos direkt nach dem ersten Bild einfügen',
    'Im Chat-/Build-Flow: sobald das erste Bild generiert ist, sofort Upload weiterer Fotos anbieten — nicht erst später. Ziel: Kunde sieht früh seine echten Bilder.',
    10
  ),
  (
    'Onboarding perfektionieren',
    'Onboarding-Flow von Begrüßung bis erster fertiger Seite durchgehen, Reibung entfernen. Wo verlieren wir Leute? Texte, Pacing, Defaults prüfen.',
    20
  ),
  (
    'Entscheidung: Link-Analyse',
    'Entscheiden, ob/wie Romy bestehende Links (Instagram, alte Site, Google-Profil) analysiert und Inhalte extrahiert. Go / No-Go vor Implementierung.',
    30
  ),
  (
    'Klarstellen: Seiten sind nicht automatisch live',
    'Sicherstellen, dass im Chat klar ist, dass die Seite erst nach expliziter „Veröffentlichen"-Bestätigung unter der Subdomain erreichbar ist (lib/romy-sites.ts:216).',
    40
  )
on conflict do nothing;
