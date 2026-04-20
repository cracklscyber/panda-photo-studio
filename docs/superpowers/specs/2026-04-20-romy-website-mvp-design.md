# Romy Website-Feature MVP — Design

**Datum:** 2026-04-20
**Status:** in Bau

## Ziel

Romy kann für jede Kundin eine eigene Website aus echtem Code (HTML/CSS) auf WhatsApp bauen und ändern. Kein statisches Template — Claude Code schreibt pro Kundin eigene Dateien.

## Entscheidungen (schon getroffen)

- **Datenmodell:** Nur Code-Dateien pro slug in Supabase Storage. Keine DB-Felder pro Seite.
- **Sandbox:** E2B mit warm reconnect (15 Min.) — bereits implementiert in `lib/romy-coder.ts`.
- **Router:** Haiku klassifiziert jede Nachricht als `build` oder `chat` — bereits implementiert in `lib/romy-router.ts`.
- **Altbestand:** Keine Live-Kundinnen → alter `luna-agent.ts`-Weg wird ersatzlos gelöscht.
- **URL-Strategie MVP:** `halloromy.com/s/<slug>` (serving bereits unter `app/custom-site/[slug]/[[...path]]/route.ts`, bekommt einen Alias auf `/s/`). Eigene Domains sind Phase 2.

## Fehlende Teile (die 6 Baustellen)

### 1. Webhook an Router + Coder anschließen
`app/api/luna-whatsapp/route.ts` ruft heute `handleLunaMessage` (alt). Neu: `routeMessage(history, text, hasImage)` aus `lib/romy-router.ts`.
- Intent `chat` → direkt Antwort zurück
- Intent `build` → (a) sofort "Moment, bin dran"-Nachricht senden, (b) `runRomyCoder({ slug, userMessage, history, imageUrl })` im Hintergrund, (c) finale Antwort senden wenn fertig

### 2. Kundin ↔ Slug-Zuordnung (`romy_sites`-Tabelle)
Neue Supabase-Tabelle:
```
romy_sites (
  phone text primary key,
  slug text unique,
  business_name text,
  created_at timestamptz,
  last_sandbox_id text,
  custom_domain text -- Phase 2
)
```
Erste Build-Nachricht einer unbekannten Nummer:
- Haiku-Mini-Call extrahiert Geschäftsname aus Nachricht
- Slug-Erzeugung inline (keine extra Library): `.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')`
- Bei Slug-Konflikt Suffix `-2`, `-3`, …
- Eintrag anlegen, dann Coder starten

### 3. "Moment, bin dran"-Nachricht
Sofort nach Intent=build → WhatsApp-Text senden: `"Moment, ich leg schon mal los 💭 (dauert ~20 s)"`. Danach läuft `runRomyCoder` in `waitUntil`. Coders finale Reply wird als zweite Nachricht geschickt.

### 4. Gesprächsverlauf speichern
Neue Tabelle `romy_conversations (phone, messages jsonb, updated_at)`. Vor jedem Router-Call laden, nach jedem Turn die letzten 30 Nachrichten speichern. (Selbes Schema wie altes `luna_conversations`, aber frisch.)

### 5. Bilder in die Sandbox reichen
Meta-Bilder kommen als base64-Data-URL rein. In `runRomyCoder`: wenn `imageUrl` gesetzt, Datei in `workspace/assets/<ts>-<rand>.jpg` schreiben und Claude Code im Prompt mitteilen ("Kundin hat ein Bild mitgeschickt, liegt unter `assets/xyz.jpg`").

### 6. Alten Code löschen
- `lib/luna-agent.ts`
- `components/templates/DefaultTemplate.tsx`, `ElegantTemplate.tsx`
- `app/luna/page.tsx` (alte Web-UI)
- `app/api/chat/route.ts` (Web-UI-Chat-Endpoint)
- `luna_websites`-Tabelle in Supabase (manuell droppen — nur Schema, keine Daten)
- `luna_conversations`-Tabelle (ditto — Logs vom alten Webhook stecken da drin, ok zu löschen)

## Phase 2 (später, nicht jetzt)

7. **Eigene Domain:** Vercel Domains API hinzufügen, Next.js `middleware.ts` prüft Host-Header gegen `custom_domain`-Spalte, rewritet intern auf `/s/<slug>/...`.

## Risiken / Gotchas

- **Telefon als Primary Key:** Wenn zwei Leute dasselbe WhatsApp benutzen, kollidieren sie. Akzeptabel für MVP.
- **Kaltstart bei neuer Kundin:** erster Build dauert ~100 s. "Moment, bin dran"-Nachricht und realistische Erwartung ("~1 Minute beim ersten Mal, dann schneller") abfangen.
- **Sandbox-Budget pro Abo:** noch nicht implementiert — Kundin schreibt unbegrenzt viele Builds. User wird Abo-Modell bauen, das an `romy_sites` gekoppelt werden muss (Spalte `plan`, monatliches Build-Budget).
- **Bereits bekannte E2B-Gotchas:** alle in `feedback_e2b_warm_sandbox.md` dokumentiert.

## Aufbauphasen

1. `romy_sites`-Tabelle + `romy_conversations`-Tabelle anlegen
2. Neuer Webhook-Handler (`app/api/luna-whatsapp/route.ts` umbauen): Router + "Moment"-Nachricht + Coder-Aufruf
3. Slug-Erzeugung (Haiku + Slugify) einbauen
4. Bild-Durchreichung in `runRomyCoder`
5. Ende-zu-Ende von echter WhatsApp-Nummer testen (eigenes Handy)
6. Alten `luna-*`-Code löschen
