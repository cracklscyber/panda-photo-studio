# Luna Custom Websites — Design Spec

**Datum:** 2026-04-15
**Status:** Approved (brainstorming phase)
**Ziel:** Luna vom slot-basierten Template-Filler zu einem echten Agent machen, der pro Kunde individuelle Websites aus einer Section-Library komponiert und mit eigenen Design-Tokens stylt. MVP-Phase: erste 5-10 Kunden über eigenen Claude-Account, danach Wechsel auf offizielle API ohne Code-Umbau.

---

## 1. Motivation

Aktueller Stand (`lib/luna-agent.ts`):
- Feste DB-Felder (`hero_title`, `services`, `offers`, `buttons`…)
- Zwei feste Templates (`DefaultTemplate`, `ElegantTemplate`) — Unterschied: nur dark/light
- Agent füllt nur vordefinierte Slots

Problem: Jeder Kunde hat unterschiedliche Bedürfnisse. Ein Online-Shop braucht Filter, ein Frisör braucht Buchung + Team, ein Café braucht Speisekarte. Alle sehen aktuell praktisch gleich aus.

Ziel: Agent entscheidet hybrid (Branche-Basis + Nachfragen + freie Kundenwünsche) welche Sections auf die Seite kommen, in welcher Reihenfolge, mit welchen Props. Design-Tokens sorgen dafür, dass keine zwei Seiten gleich aussehen.

---

## 2. High-Level Architektur

```
┌──────────────────────────────────────────────────────────┐
│  WhatsApp (Twilio)  /  Web-Chat  /  /luna Admin         │
└──────────────────────────────┬───────────────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │    lib/luna-agent.ts  │   (orchestration)
                   └───────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼────────┐   ┌─────────▼────────┐
│  lib/ai/       │   │  Agent Tools     │   │  Supabase        │
│  (provider-    │   │  (add_section,   │   │  luna_websites   │
│   agnostic)    │   │   update_tokens, │   │  { layout,       │
│                │   │   …)             │   │    design_tokens }│
└────────────────┘   └──────────────────┘   └──────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │ app/site/[slug]       │
                   │  Renderer → Section   │
                   │  Registry + Tokens    │
                   └───────────────────────┘
```

---

## 3. AI-Service-Layer (`lib/ai/`)

### 3.1 Struktur

```
lib/ai/
  index.ts              // Public API
  types.ts              // Provider-unabhängige Typen
  config.ts             // Env-basierte Provider-Auswahl
  providers/
    claude-personal.ts  // MVP: dein Claude-Account
    anthropic.ts        // Offizielle Anthropic-API
    gemini.ts           // Legacy-Wrapper (für Backwards-Compat während Migration)
```

### 3.2 Public API

```ts
// lib/ai/types.ts
export type Role = 'user' | 'assistant' | 'system'
export interface Message { role: Role; content: string | ContentPart[] }
export interface ContentPart { type: 'text' | 'image'; text?: string; image_url?: string }
export interface ToolDef { name: string; description: string; parameters: JSONSchema }
export interface ToolCall { id: string; name: string; args: Record<string, unknown> }
export interface ToolResult { id: string; name: string; result: string }

export interface RunAgentInput {
  system: string
  messages: Message[]
  tools?: ToolDef[]
  maxIterations?: number
  onToolCall: (call: ToolCall) => Promise<ToolResult>
}
export interface RunAgentOutput { text: string; toolCalls: ToolCall[] }

// lib/ai/index.ts
export async function generateText(input: { system: string; messages: Message[] }): Promise<string>
export async function generateStructured<T>(input: { system: string; messages: Message[]; schema: ZodSchema<T> }): Promise<T>
export async function runAgent(input: RunAgentInput): Promise<RunAgentOutput>
```

### 3.3 Provider-Interface (intern)

```ts
// providers/base.ts
export interface AIProvider {
  generateText(input): Promise<string>
  generateStructured<T>(input): Promise<T>
  runAgent(input): Promise<RunAgentOutput>
}
```

Jeder Provider implementiert dieses Interface. `lib/ai/index.ts` liest `AI_PROVIDER` aus env und dispatched.

### 3.4 Config

```bash
# .env
AI_PROVIDER=claude-personal      # oder: anthropic | gemini
AI_MODEL=claude-opus-4-6         # oder gemini-2.5-flash etc.
CLAUDE_PERSONAL_API_KEY=...      # nur MVP
ANTHROPIC_API_KEY=...            # später
GOOGLE_API_KEY=...               # legacy
```

### 3.5 Migrations-Pfad MVP → Production

**Phase 1 (MVP, 1-10 Kunden):**
- `AI_PROVIDER=claude-personal`
- Nutzt Claude-Opus-4.6 über deinen persönlichen Account
- Rate-Limits shared zwischen allen Kunden → ok für 5-10 parallele Chats

**Phase 2 (nach MVP-Validierung):**
- `AI_PROVIDER=anthropic` setzen, `ANTHROPIC_API_KEY` hinterlegen
- Kein Code-Change nötig
- `claude-personal.ts` Provider bleibt für Dev/Tests

**Regel:** Im Rest der Codebase (`luna-agent.ts`, Routes, etc.) NIE direkt `@google/genai` oder `@anthropic-ai/sdk` importieren. Nur `lib/ai` nutzen.

---

## 4. Section-Library (`components/sections/`)

### 4.1 Struktur

```
components/sections/
  registry.ts           // { [type]: { Component, schema, defaultProps, category } }
  types.ts              // Section<T>, DesignTokens
  hero/
    HeroMinimal.tsx
    HeroBold.tsx
    HeroImageBg.tsx
  gallery/
    GalleryGrid.tsx
    GalleryFilterable.tsx
    GalleryCarousel.tsx
  services/
    ServicesList.tsx
    PricingTable.tsx
    MenuList.tsx
  booking/
    BookingEmbed.tsx
    ContactForm.tsx
  info/
    AboutText.tsx
    TeamCards.tsx
    Testimonials.tsx
    FAQ.tsx
    OpeningHours.tsx
    MapEmbed.tsx
  cta/
    OffersBanner.tsx
    ButtonBar.tsx
```

### 4.2 Section-Schema

Jede Section definiert Zod-Schema für ihre Props:

```ts
// components/sections/hero/HeroMinimal.tsx
import { z } from 'zod'

export const HeroMinimalProps = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  primary_cta: z.object({ label: z.string(), href: z.string() }).optional(),
})

export function HeroMinimal(props: z.infer<typeof HeroMinimalProps>) { /* JSX */ }
```

### 4.3 Registry

```ts
// components/sections/registry.ts
export const SECTION_REGISTRY = {
  HeroMinimal: { Component: HeroMinimal, schema: HeroMinimalProps, category: 'hero', description: '...' },
  GalleryFilterable: { Component: GalleryFilterable, schema: GalleryFilterableProps, category: 'gallery', description: 'Bildergalerie mit Kategorie-Filter' },
  // ...
}
export type SectionType = keyof typeof SECTION_REGISTRY
```

### 4.4 MVP-Umfang (Launch)

**Pflicht für MVP:** HeroMinimal, HeroBold, GalleryGrid, GalleryFilterable, ServicesList, PricingTable, BookingEmbed, ContactForm, OpeningHours, OffersBanner, ButtonBar, AboutText, FAQ, MapEmbed (≈14 Sections).

**Später:** MenuList, TeamCards, Testimonials, HeroImageBg, GalleryCarousel.

---

## 5. Design Tokens

Pro Kunde generiert der Agent ein `design_tokens` Objekt. Wird im Renderer als CSS-Variablen gesetzt, alle Sections lesen daraus → einheitlicher Look trotz individueller Werte.

### 5.1 Token-Schema

```ts
export const DesignTokens = z.object({
  colors: z.object({
    background: z.string(),        // hex
    foreground: z.string(),
    primary: z.string(),
    primary_contrast: z.string(),
    accent: z.string(),
    muted: z.string(),
    border: z.string(),
  }),
  typography: z.object({
    font_heading: z.enum(['inter','playfair','poppins','cormorant','lora','montserrat','raleway','caveat','dm_sans','space_grotesk']),
    font_body: z.enum([/* same */]),
    scale: z.enum(['compact','normal','spacious']),
  }),
  radius: z.enum(['sharp','subtle','rounded','pill']),
  shadow: z.enum(['none','soft','crisp','dramatic']),
  spacing: z.enum(['tight','normal','airy']),
  style_vibe: z.enum(['minimal','bold','elegant','playful','technical','warm']),
})
```

### 5.2 Anwendung im Renderer

```tsx
// app/site/[slug]/page.tsx
<div style={tokensToCSSVars(tokens)} className={`vibe-${tokens.style_vibe} radius-${tokens.radius}`}>
  {layout.map(section => <SectionRenderer key={section.id} section={section} />)}
</div>
```

---

## 6. Datenbank-Schema

### 6.1 Migration `luna_websites`

**Neue Felder:**
```sql
ALTER TABLE luna_websites ADD COLUMN layout jsonb DEFAULT '[]'::jsonb;
ALTER TABLE luna_websites ADD COLUMN design_tokens jsonb;
```

**Struktur `layout`:**
```json
[
  { "id": "sec_abc123", "type": "HeroMinimal", "props": { "title": "Friseur Marco", "subtitle": "…" } },
  { "id": "sec_def456", "type": "GalleryFilterable", "props": { "images": [...], "filters": ["Haare","Bart","Color"] } },
  { "id": "sec_ghi789", "type": "BookingEmbed", "props": { "provider": "booksy", "url": "…" } }
]
```

**Legacy-Felder** (`hero_title`, `services`, `offers`, `buttons`, `gallery`, …): vorerst behalten für Rückwärtskompatibilität, bei neuen Kunden nicht mehr befüllen. Nach Phase-1-Validierung löschen.

### 6.2 Bestandskunden

Einmalig Migration: lese alte Felder, generiere `layout[]` + `design_tokens`, schreibe zurück. Einmal-Skript in `scripts/migrate-legacy-sites.ts`.

---

## 7. Agent-Tools (neu)

Ersetzt die aktuellen Feld-basierten Tools:

| Tool | Zweck |
|---|---|
| `list_available_sections()` | Agent fragt Registry ab (inkl. Beschreibungen) — kontextspart Tokens im System-Prompt |
| `add_section(type, props, position?)` | Neue Section hinzufügen; position = index oder 'end' |
| `update_section(id, props)` | Props einer Section patchen |
| `remove_section(id)` | Section entfernen |
| `reorder_sections(ids[])` | Reihenfolge setzen |
| `update_design_tokens(tokens)` | Ganze Token-Palette setzen/patchen |
| `create_website(slug, business_name, branch)` | Wie bisher |
| `publish_website()` | Wie bisher |
| `upload_image_to_gallery(url)` / `set_logo(url)` | Media-Handling |

**Validierung:** `add_section` / `update_section` validieren Props gegen `registry[type].schema` — Agent-Fehler werden als Tool-Error zurückgegeben, Agent kann korrigieren.

---

## 8. Agent-Flow (Hybrid)

Neuer System-Prompt-Kern:

1. **Branche erkennen** → aus Branche leite Default-Basis-Sections ab (z.B. Frisör → Hero, Services, Team, Booking, Gallery, OpeningHours, Contact).
2. **Design-Tokens generieren** passend zur Branche + User-Präferenz (Farben, Vibe).
3. **Nachfragen bei Unsicherheit:** „Ich würd dir Termin-Buchung einbauen — nutzt du Booksy, Calendly, oder willst du Kontaktformular?"
4. **Frei reagieren auf Kundenwünsche:** „Ich will eine Galerie mit Filter nach Kategorie" → Agent nutzt `GalleryFilterable` mit entsprechenden Props.
5. **Proaktiv vorschlagen:** „Willst du auch FAQ? Viele Frisöre haben Fragen zu Preisen/Dauer."

Der Prompt enthält:
- Kurzbeschreibung jeder Section-Kategorie
- `list_available_sections()` für Details on-demand
- Aktueller `layout[]` Status der Website des Kunden
- Aktuelle `design_tokens`

---

## 9. Renderer (`app/site/[slug]/page.tsx`)

```tsx
export default async function Page({ params }) {
  const site = await getSite(params.slug)
  if (!site) return notFound()

  return (
    <TokensProvider tokens={site.design_tokens}>
      {site.layout.map(section => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </TokensProvider>
  )
}

// SectionRenderer
function SectionRenderer({ section }) {
  const entry = SECTION_REGISTRY[section.type]
  if (!entry) return null  // gracefully skip unknown types (Forward-Compat)
  const parsed = entry.schema.safeParse(section.props)
  if (!parsed.success) return <SectionError type={section.type} errors={parsed.error} />
  const { Component } = entry
  return <Component {...parsed.data} />
}
```

**Fehlerbehandlung:**
- Unbekannter Section-Type (z.B. Registry-Downgrade): skip, nicht crashen
- Invalid props: sichtbarer Admin-Fehler nur wenn `?preview=1`, sonst skip
- Fehlende `design_tokens`: Fallback auf Default-Tokens

---

## 10. Rollout-Plan

### Phase 0 — Vorbereitung (Woche 1)
- `lib/ai/` Skeleton + Claude-Personal-Provider + Gemini-Legacy-Wrapper
- Bestehenden `luna-agent.ts` auf `lib/ai.runAgent()` umstellen, keine Funktionsänderung (Refactor only)
- Verify: Alle bestehenden Kunden-Flows funktionieren weiter

### Phase 1 — Section-Library (Woche 2)
- 14 MVP-Sections implementieren
- Registry + SectionRenderer + Tokens-System
- Neue Agent-Tools

### Phase 2 — Cutover (Woche 3)
- Neue Kunden bekommen nur noch `layout[]`-basierte Sites
- Legacy-Templates bleiben als Fallback für Bestandskunden
- Manuelle Migrations für Bestand (5-10 Kunden, einzeln)

### Phase 3 — Production-AI-Switch (nach 10 Kunden)
- ENV: `AI_PROVIDER=anthropic`
- Keine Code-Änderung
- Beobachten: Latenz, Kosten, Error-Rate

### Phase 4 — Cleanup (später)
- Legacy-Felder aus DB entfernen
- `DefaultTemplate` / `ElegantTemplate` löschen

---

## 11. Nicht-Ziele (YAGNI)

- **Keine** on-the-fly-JSX-Generierung durch LLM (Option B aus Brainstorm) — zu komplex für MVP
- **Keine** Custom-Domains (kommt später)
- **Kein** WYSIWYG-Editor — Admin-UI in `/luna` reicht
- **Keine** A/B-Tests, Analytics, SEO-Automation
- **Keine** Multi-Language — nur Deutsch

---

## 12. Offene Fragen / Risiken

- **Agent-Kontextgröße:** 14+ Sections × Schema im System-Prompt wird groß. Mitigation: Kurz-Beschreibungen im Prompt, volle Schemas nur via `list_available_sections(type)` on demand.
- **Claude-Personal Rate-Limits:** Bei 10 parallelen Chats könnte es eng werden. Mitigation: Queue in `lib/ai/providers/claude-personal.ts` oder fallback auf Gemini.
- **Design-Token-Konsistenz:** Agent könnte ungewöhnliche Kombinationen generieren. Mitigation: Zod-Enum-Constraints + kuratierte Presets pro Branche als Startpunkt.

---

## 13. Acceptance Criteria

- [ ] `lib/ai.runAgent()` bedient Luna ohne dass `luna-agent.ts` Provider-SDKs importiert
- [ ] ENV-Wechsel `AI_PROVIDER=claude-personal` → `anthropic` erfordert keinen Code-Change
- [ ] Neuer Kunde durchläuft Onboarding → erhält `layout[]` + `design_tokens`, keine Legacy-Felder befüllt
- [ ] Zwei Kunden unterschiedlicher Branchen haben merklich unterschiedliches Design (Farben, Typo, Radius, Shadow, Vibe)
- [ ] Agent kann Section hinzufügen/entfernen/umordnen per WhatsApp-Message
- [ ] Renderer zeigt Site korrekt mit mindestens 6 verschiedenen Section-Typen kombiniert
- [ ] Unbekannter Section-Type crasht Renderer nicht
