import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // Friseur Marco (Dark/Bold)
  await supabase
    .from('luna_websites')
    .upsert({
      slug: 'friseur-marco',
      phone: '+491701234567',
      status: 'published',
      business_name: 'Friseur Marco',
      branch: 'friseur',
      description: 'Dein Friseur in Berlin-Kreuzberg',
      address: 'Oranienstraße 42, 10999 Berlin',
      phone_display: '030 1234567',
      email: 'info@friseur-marco.de',
      opening_hours: {
        'Montag - Freitag': '9:00 - 18:00',
        'Samstag': '9:00 - 14:00',
        'Sonntag': 'Geschlossen'
      },
      color_primary: '#6C5CE7',
      color_secondary: '#FFFFFF',
      font: 'playfair',
      style: 'dark',
      buttons: [
        { type: 'whatsapp', label: 'WhatsApp', enabled: true },
        { type: 'booking', label: 'Termin buchen', url: 'https://calendly.com/friseur-marco', enabled: true },
        { type: 'call', label: 'Anrufen', enabled: true }
      ],
      template: 'default',
      hero_title: 'Friseur Marco',
      hero_subtitle: 'Dein Style. Unsere Leidenschaft. Seit 2015 in Kreuzberg.',
      about_text: 'Bei Friseur Marco bekommst du mehr als nur einen Haarschnitt. Wir nehmen uns Zeit für dich, beraten dich individuell und sorgen dafür, dass du dich rundum wohl fühlst. Unser Team aus erfahrenen Stylisten freut sich auf deinen Besuch.',
      services: [
        { name: 'Herrenschnitt', price: '25 €', description: 'Waschen, Schneiden, Stylen' },
        { name: 'Damenschnitt', price: 'ab 35 €', description: 'Waschen, Schneiden, Föhnen' },
        { name: 'Bart trimmen', price: '15 €', description: 'Kontur und Pflege' },
        { name: 'Färben', price: 'ab 45 €', description: 'Beratung, Färben, Pflege' },
        { name: 'Hochsteckfrisur', price: 'ab 55 €', description: 'Für Events und Hochzeiten' },
        { name: 'Kinderschnitt', price: '18 €', description: 'Bis 12 Jahre' }
      ],
      gallery: [],
      offers: [
        { title: 'Neukunden-Rabatt', description: '15% Rabatt auf deinen ersten Besuch!', active: true },
        { title: 'Happy Hour', description: 'Dienstag & Mittwoch 14-16 Uhr: Herrenschnitt für nur 20€', active: true }
      ],
      logo_url: null,
      cover_url: null
    }, { onConflict: 'slug' })

  // Nagelstudio Rosé (Elegant/Pastell)
  const { data, error } = await supabase
    .from('luna_websites')
    .upsert({
      slug: 'nagelstudio-rose',
      phone: '+491709876543',
      status: 'published',
      business_name: 'Nagelstudio Rosé',
      branch: 'nagelstudio',
      description: 'Dein Nagelstudio in München-Schwabing',
      address: 'Leopoldstraße 88, 80802 München',
      phone_display: '089 9876543',
      email: 'hello@nagelstudio-rose.de',
      opening_hours: {
        'Montag': 'Geschlossen',
        'Dienstag - Freitag': '10:00 - 19:00',
        'Samstag': '10:00 - 16:00',
        'Sonntag': 'Geschlossen'
      },
      color_primary: '#C8A2C8',
      color_secondary: '#F9F1F6',
      font: 'cormorant',
      style: 'light',
      buttons: [
        { type: 'booking', label: 'Termin buchen', url: 'https://booksy.com/nagelstudio-rose', enabled: true },
        { type: 'whatsapp', label: 'Schreib uns', enabled: true },
        { type: 'call', label: 'Anrufen', enabled: true }
      ],
      template: 'elegant',
      hero_title: 'Nagelstudio Rosé',
      hero_subtitle: 'Gepflegte Nägel. Entspannte Atmosphäre. Dein Moment für dich.',
      about_text: 'Im Nagelstudio Rosé dreht sich alles um dich. In unserer ruhigen, stilvollen Atmosphäre in München-Schwabing verwöhnen wir dich mit erstklassiger Nagelpflege. Ob klassische Maniküre, Gel-Nägel oder Nail Art — wir nehmen uns Zeit für jedes Detail.',
      services: [
        { name: 'Klassische Maniküre', price: '35 €', description: 'Feilen, Nagelhaut, Pflege, Lack' },
        { name: 'Gel-Nägel Neumodellage', price: '65 €', description: 'Kompletter Aufbau mit Gel' },
        { name: 'Gel-Nägel Auffüllen', price: '45 €', description: 'Nachfüllen nach 3-4 Wochen' },
        { name: 'Shellac / UV-Lack', price: '40 €', description: 'Hält bis zu 3 Wochen' },
        { name: 'Nail Art', price: 'ab 5 €', description: 'Pro Nagel — Glitter, Steine, Designs' },
        { name: 'Pediküre', price: '45 €', description: 'Fußpflege mit Lack' },
        { name: 'Maniküre & Pediküre Kombi', price: '70 €', description: 'Beides zum Sparpreis' },
        { name: 'Nagelverlängerung', price: 'ab 75 €', description: 'Acryl oder Gel-Tips' }
      ],
      gallery: [],
      offers: [
        { title: 'Neukunden-Angebot', description: 'Dein erster Besuch: 20% auf alle Treatments!', active: true },
        { title: 'Bring a Friend', description: 'Komm mit einer Freundin — beide erhalten 15% Rabatt', active: true }
      ],
      logo_url: null,
      cover_url: null
    }, { onConflict: 'slug' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, site: data })
}
