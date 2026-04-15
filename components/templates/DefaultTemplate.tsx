import { TemplateProps, getWhatsAppLink, getMapsLink } from './types'

export default function DefaultTemplate({ site: w, fontFamily }: TemplateProps) {
  const primary = w.color_primary || '#6C5CE7'
  const isDark = (w.style || 'dark') === 'dark'
  const activeOffers = w.offers?.filter(o => o.active) || []
  const openingHours = w.opening_hours || {}
  const services = w.services || []
  const gallery = w.gallery || []
  const buttons = (w.buttons || []).filter(b => b.enabled)
  const whatsappLink = getWhatsAppLink(w.phone_display)
  const mapsLink = getMapsLink(w.address)

  const bg = isDark ? '#0A0A0F' : '#FFFFFF'
  const bgCard = isDark ? '#111118' : '#F8F8FA'
  const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const textPrimary = isDark ? '#FFFFFF' : '#111111'
  const textSecondary = isDark ? 'rgb(156,163,175)' : 'rgb(107,114,128)'
  const textMuted = isDark ? 'rgb(107,114,128)' : 'rgb(156,163,175)'
  const navBg = isDark ? 'rgba(10,10,15,0.8)' : 'rgba(255,255,255,0.8)'

  const getButtonHref = (btn: { type: string; url?: string }) => {
    switch (btn.type) {
      case 'whatsapp': return whatsappLink
      case 'booking': return btn.url || '#'
      case 'call': return `tel:${w.phone_display?.replace(/[\s\-]/g, '')}`
      case 'custom': return btn.url || '#'
      default: return '#'
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: bg, color: textPrimary, fontFamily }}>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl" style={{ backgroundColor: navBg, borderBottom: `1px solid ${borderColor}` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {w.logo_url ? (
              <img src={w.logo_url} alt={w.business_name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, ${primary}BB)` }}>
                {w.business_name?.charAt(0) || 'L'}
              </div>
            )}
            <span className="text-lg font-bold">{w.business_name}</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: textSecondary }}>
            {w.about_text && <a href="#about" className="hover:opacity-80 transition-opacity">Über uns</a>}
            {services.length > 0 && <a href="#services" className="hover:opacity-80 transition-opacity">Leistungen</a>}
            {activeOffers.length > 0 && <a href="#offers" className="hover:opacity-80 transition-opacity">Angebote</a>}
            {gallery.length > 0 && <a href="#gallery" className="hover:opacity-80 transition-opacity">Galerie</a>}
            <a href="#contact" className="hover:opacity-80 transition-opacity">Kontakt</a>
          </div>
          {buttons.length > 0 && (
            <a href={getButtonHref(buttons[0])} target={buttons[0].type === 'call' ? '_self' : '_blank'} rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 text-white font-semibold py-2 px-5 rounded-full text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: buttons[0].type === 'whatsapp' ? '#25D366' : primary }}>
              {buttons[0].label}
            </a>
          )}
        </div>
      </nav>

      {/* Floating Mobile CTA */}
      {buttons.length > 0 && (
        <a href={getButtonHref(buttons[0])} target={buttons[0].type === 'call' ? '_self' : '_blank'} rel="noopener noreferrer"
          className="md:hidden fixed bottom-6 right-6 z-50 py-3 px-6 rounded-full flex items-center gap-2 shadow-lg text-white font-semibold transition-all hover:scale-105"
          style={{ backgroundColor: buttons[0].type === 'whatsapp' ? '#25D366' : primary, boxShadow: `0 8px 24px ${buttons[0].type === 'whatsapp' ? 'rgba(37,211,102,0.3)' : `${primary}40`}` }}>
          {buttons[0].label}
        </a>
      )}

      {/* Hero */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-6">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-20" style={{ backgroundColor: primary }} />
        {w.cover_url && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${w.cover_url})`, opacity: isDark ? 0.1 : 0.08 }} />}
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">{w.hero_title || w.business_name}</h1>
          {w.hero_subtitle && <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: textSecondary }}>{w.hero_subtitle}</p>}
          {buttons.length > 0 && (
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              {buttons.slice(0, 3).map((btn, i) => (
                <a key={i} href={getButtonHref(btn)} target={btn.type === 'call' ? '_self' : '_blank'} rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-3 font-semibold py-4 px-8 rounded-full text-lg transition-all hover:-translate-y-0.5 ${i === 0 ? 'text-white hover:shadow-lg' : ''}`}
                  style={i === 0 ? { backgroundColor: btn.type === 'whatsapp' ? '#25D366' : primary, boxShadow: `0 8px 24px ${btn.type === 'whatsapp' ? 'rgba(37,211,102,0.25)' : `${primary}30`}` }
                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${borderColor}`, color: textPrimary }}>
                  {btn.type === 'whatsapp' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                  {btn.type === 'booking' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  {btn.type === 'call' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                  {btn.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Angebote */}
      {activeOffers.length > 0 && (
        <section id="offers" className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Aktuelle Angebote</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {activeOffers.map((offer, i) => (
                <div key={i} className="rounded-2xl p-8 border transition-colors" style={{ borderColor: `${primary}40`, backgroundColor: `${primary}08` }}>
                  <div className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 text-white" style={{ backgroundColor: primary }}>Angebot</div>
                  <h3 className="text-xl font-bold mb-2">{offer.title}</h3>
                  <p style={{ color: textSecondary }}>{offer.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Über uns */}
      {w.about_text && (
        <section id="about" className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Über uns</h2>
            <p className="text-lg leading-relaxed" style={{ color: textSecondary }}>{w.about_text}</p>
          </div>
        </section>
      )}

      {/* Leistungen */}
      {services.length > 0 && (
        <section id="services" className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Unsere Leistungen</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((service, i) => (
                <div key={i} className="rounded-xl p-6 flex justify-between items-start transition-colors" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    {service.description && <p className="text-sm mt-1" style={{ color: textMuted }}>{service.description}</p>}
                  </div>
                  {service.price && <span className="font-bold text-lg whitespace-nowrap ml-4" style={{ color: primary }}>{service.price}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Galerie */}
      {gallery.length > 0 && (
        <section id="gallery" className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Galerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map((img, i) => (
                <div key={i} className="rounded-xl overflow-hidden aspect-square" style={{ border: `1px solid ${borderColor}` }}>
                  <img src={img.url} alt={img.caption || `Bild ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Kontakt */}
      <section id="contact" className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Kontakt & Öffnungszeiten</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.keys(openingHours).length > 0 && (
              <div className="rounded-2xl p-8" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
                <h3 className="text-lg font-bold mb-6">Öffnungszeiten</h3>
                <div className="space-y-4">
                  {Object.entries(openingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between" style={{ color: textSecondary }}>
                      <span className="font-medium" style={{ color: textPrimary }}>{day}</span>
                      <span>{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-2xl p-8" style={{ backgroundColor: bgCard, border: `1px solid ${borderColor}` }}>
              <h3 className="text-lg font-bold mb-6">So erreichst du uns</h3>
              <div className="space-y-5">
                {w.address && (
                  <a href={mapsLink || '#'} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 transition-opacity hover:opacity-80">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primary}15`, color: primary }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div><p className="text-sm" style={{ color: textMuted }}>Adresse</p><p>{w.address}</p></div>
                  </a>
                )}
                {w.phone_display && (
                  <a href={`tel:${w.phone_display.replace(/[\s\-]/g, '')}`} className="flex items-start gap-4 transition-opacity hover:opacity-80">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primary}15`, color: primary }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <div><p className="text-sm" style={{ color: textMuted }}>Telefon</p><p>{w.phone_display}</p></div>
                  </a>
                )}
                {w.email && (
                  <a href={`mailto:${w.email}`} className="flex items-start gap-4 transition-opacity hover:opacity-80">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primary}15`, color: primary }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <div><p className="text-sm" style={{ color: textMuted }}>E-Mail</p><p>{w.email}</p></div>
                  </a>
                )}
                {buttons.some(b => b.type === 'whatsapp') && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 transition-opacity hover:opacity-80">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div><p className="text-sm" style={{ color: textMuted }}>WhatsApp</p><p className="text-[#25D366]">Jetzt schreiben</p></div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: `1px solid ${borderColor}` }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: textMuted }}>&copy; {new Date().getFullYear()} {w.business_name}</p>
          <p className="text-xs" style={{ color: isDark ? 'rgb(55,65,81)' : 'rgb(209,213,219)' }}>Erstellt mit Luna</p>
        </div>
      </footer>
    </div>
  )
}
