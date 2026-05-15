export type SiteTemplate = {
  id: string
  name: string
  tagline: string
  fitFor: string
  preview: {
    bg: string
    surface: string
    ink: string
    accent: string
    muted: string
    fontFamily: 'serif' | 'sans' | 'display-serif'
    headlineWeight: 'regular' | 'medium' | 'bold'
    tag: string
    headline: string
    sub: string
    cta: string
  }
  styleDescription: string
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'cafe-bistro',
    name: 'Café & Bistro',
    tagline: 'Warme Beige- und Holztöne, große Serif-Headlines, ruhige Galerie',
    fitFor: 'Café, Bäckerei, Bistro, Eisdiele',
    preview: {
      bg: '#f5efe2',
      surface: '#ffffff',
      ink: '#1f1a14',
      accent: '#a47b48',
      muted: '#6b6258',
      fontFamily: 'serif',
      headlineWeight: 'medium',
      tag: 'SPECIALTY COFFEE',
      headline: 'Hand-geröstet,\nlangsam gebrüht.',
      sub: 'Sonnenstraße 14 · München',
      cta: 'Karte ansehen',
    },
    styleDescription:
      'helles, warmes Layout mit Beige- und Holztönen, große Serif-Headlines, viel Weißraum, eine ruhige Galerie aus echten Foto-Stimmungen, Adresse und Öffnungszeiten prominent',
  },
  {
    id: 'friseur-beauty',
    name: 'Friseur & Beauty',
    tagline: 'Schwarz/Weiß, Fashion-Serif, redaktionelles Editorial-Gefühl',
    fitFor: 'Friseur, Kosmetik, Nagelstudio, Brow-Bar',
    preview: {
      bg: '#0f0f0f',
      surface: '#1a1a1a',
      ink: '#f5f1ec',
      accent: '#d4af7a',
      muted: '#9a9590',
      fontFamily: 'display-serif',
      headlineWeight: 'bold',
      tag: 'STUDIO · BERLIN',
      headline: 'Schnitte mit\nHaltung.',
      sub: 'Termine nach Vereinbarung',
      cta: 'Termin anfragen',
    },
    styleDescription:
      'dunkles, redaktionelles Layout mit großem Display-Serif für Headlines, viel Schwarz und Cremeweiß, ein dezenter goldener Akzent, große Portraits im Editorial-Stil, klarer Termin-Call-to-Action',
  },
  {
    id: 'yoga-wellness',
    name: 'Yoga & Wellness',
    tagline: 'Sage, Cream, viel Luft, ruhige Light-Serif',
    fitFor: 'Yoga-Studio, Coaching, Physio, Heilpraxis',
    preview: {
      bg: '#eef0e9',
      surface: '#fbfaf6',
      ink: '#2a3328',
      accent: '#7e9275',
      muted: '#6f7a6b',
      fontFamily: 'serif',
      headlineWeight: 'regular',
      tag: '· FLOW STUDIO',
      headline: 'Ankommen,\natmen, üben.',
      sub: 'Hatha · Vinyasa · Yin',
      cta: 'Kursplan',
    },
    styleDescription:
      'ruhiges, weiches Layout in Salbeigrün und Cremeweiß, leichte Serif-Schriften, sehr viel Weißraum, dezente Trennlinien, Kursplan und Preise klar strukturiert',
  },
  {
    id: 'restaurant-fine',
    name: 'Restaurant',
    tagline: 'Tiefes Anthrazit + Gold, Display-Serif, foto-driven',
    fitFor: 'Restaurant, Weinbar, Hotel-Gastronomie',
    preview: {
      bg: '#161412',
      surface: '#1f1c19',
      ink: '#f0e8da',
      accent: '#c69a4f',
      muted: '#a89a85',
      fontFamily: 'display-serif',
      headlineWeight: 'medium',
      tag: '— SAISONAL',
      headline: 'Eine Karte,\ndie sich wandelt.',
      sub: 'Reservierung empfohlen',
      cta: 'Tisch reservieren',
    },
    styleDescription:
      'elegantes, dunkles Layout mit tiefem Anthrazit und Gold-Akzenten, große Display-Serif-Headlines, foto-driven mit großem Hero-Bild vom Gericht oder Innenraum, Reservierungs-CTA sichtbar, Karte saisonal als Editorial-Liste',
  },
  {
    id: 'handwerk-werkstatt',
    name: 'Handwerk & Werkstatt',
    tagline: 'Off-White + Rost-Orange, Bold Sans, ehrlich und sachlich',
    fitFor: 'Tischler, KFZ, Metallbau, Garten- und Landschaftsbau',
    preview: {
      bg: '#f4ede4',
      surface: '#ffffff',
      ink: '#1a1714',
      accent: '#c75a2a',
      muted: '#6b6258',
      fontFamily: 'sans',
      headlineWeight: 'bold',
      tag: 'SEIT 1987',
      headline: 'Handarbeit,\nsauber gemacht.',
      sub: 'Werkstatt in Hamburg-Altona',
      cta: 'Anfrage stellen',
    },
    styleDescription:
      'sachliches Layout mit warmem Off-White, klaren Rost-Orange-Akzenten, kräftige Sans-Serif für Headlines, ehrliche Fotos von Werkstatt und Arbeit, prominenter Anfrage-CTA, Service-Liste mit Preisrahmen',
  },
  {
    id: 'berater-service',
    name: 'Berater & Service',
    tagline: 'Navy + Cream, klare Sans, Editorial-Trust',
    fitFor: 'Steuerberater, Anwaltskanzlei, Consulting, Architektur',
    preview: {
      bg: '#0e1a2b',
      surface: '#15243a',
      ink: '#eee7d8',
      accent: '#c9a875',
      muted: '#a8b2c1',
      fontFamily: 'serif',
      headlineWeight: 'medium',
      tag: 'KANZLEI · MÜNCHEN',
      headline: 'Klarer Rat,\nverlässlich.',
      sub: 'Mandate seit 2009',
      cta: 'Erstgespräch',
    },
    styleDescription:
      'seriöses Editorial-Layout in tiefem Navy und Cremeweiß, ruhige Serif-Headlines, klare Service-Spalten, Team-Portraits in zurückgenommenem Stil, prominenter Erstgespräch-CTA, viel Weißraum und Vertrauens-Signale (Mandate, Jahre, Standorte)',
  },
]

export function getTemplateById(id: string): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((t) => t.id === id)
}

export const PENDING_TEMPLATE_KEY = 'romy-pending-template'

export const TEMPLATE_MARKER_PREFIX = 'ROMY_TEMPLATE'

export function buildTemplateChatMessage(template: SiteTemplate): string {
  return `[${TEMPLATE_MARKER_PREFIX}:${template.id}] Ich möchte gern eine Seite im Stil "${template.name}" bauen: ${template.styleDescription}.`
}

export function stripTemplateMarker(content: string): {
  text: string
  templateId?: string
} {
  const match = content.match(/^\[ROMY_TEMPLATE:([^\]]+)\]\s*/)
  if (!match) return { text: content }
  return {
    text: content.slice(match[0].length).trim(),
    templateId: match[1],
  }
}
