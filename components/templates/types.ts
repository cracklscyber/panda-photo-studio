export interface ButtonData {
  type: 'whatsapp' | 'booking' | 'call' | 'custom'
  label: string
  url?: string
  enabled: boolean
}

export interface WebsiteData {
  id: string
  slug: string
  business_name: string
  branch: string
  description: string
  address: string
  phone_display: string
  email: string
  opening_hours: Record<string, string>
  color_primary: string
  color_secondary: string
  template: string
  font: string
  style: string
  buttons: ButtonData[]
  hero_title: string
  hero_subtitle: string
  about_text: string
  services: { name: string; price?: string; description?: string }[]
  gallery: { url: string; caption?: string }[]
  offers: { title: string; description: string; active: boolean }[]
  logo_url: string
  cover_url: string
}

export interface TemplateProps {
  site: WebsiteData
  fontImport: string
  fontFamily: string
}

export const FONT_MAP: Record<string, { name: string; import: string }> = {
  inter: { name: 'Inter', import: 'Inter:wght@300;400;500;600;700' },
  playfair: { name: 'Playfair Display', import: 'Playfair+Display:wght@400;500;600;700' },
  poppins: { name: 'Poppins', import: 'Poppins:wght@300;400;500;600;700' },
  cormorant: { name: 'Cormorant Garamond', import: 'Cormorant+Garamond:wght@300;400;500;600;700' },
  lora: { name: 'Lora', import: 'Lora:wght@400;500;600;700' },
  montserrat: { name: 'Montserrat', import: 'Montserrat:wght@300;400;500;600;700' },
  raleway: { name: 'Raleway', import: 'Raleway:wght@300;400;500;600;700' },
  caveat: { name: 'Caveat', import: 'Caveat:wght@400;500;600;700' },
  dm_sans: { name: 'DM Sans', import: 'DM+Sans:wght@300;400;500;600;700' },
  space_grotesk: { name: 'Space Grotesk', import: 'Space+Grotesk:wght@300;400;500;600;700' },
}

export function getWhatsAppLink(phone: string): string {
  const num = phone?.replace(/[\s\-\(\)\/]/g, '').replace(/^0/, '49') || ''
  return `https://wa.me/${num}`
}

export function getMapsLink(address: string): string | null {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null
}
