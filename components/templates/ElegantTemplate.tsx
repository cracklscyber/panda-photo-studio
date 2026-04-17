import { TemplateProps, getWhatsAppLink, getMapsLink } from './types'

export default function ElegantTemplate({ site: w, fontFamily }: TemplateProps) {
  const primary = w.color_primary || '#C8A2C8'
  const secondary = w.color_secondary || '#F9F1F6'
  const activeOffers = w.offers?.filter(o => o.active) || []
  const openingHours = w.opening_hours || {}
  const services = w.services || []
  const gallery = w.gallery || []
  const buttons = (w.buttons || []).filter(b => b.enabled)
  const whatsappLink = getWhatsAppLink(w.phone_display)
  const mapsLink = getMapsLink(w.address)

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
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ fontFamily, backgroundColor: secondary, color: '#2D2A32' }}
    >
      {/* Decorative top gradient line */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, transparent, ${primary}, transparent)` }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ backgroundColor: `${secondary}E6`, borderColor: `${primary}20` }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {w.logo_url ? (
              <img src={w.logo_url} alt={w.business_name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-light text-lg"
                style={{ backgroundColor: primary }}>
                {w.business_name?.charAt(0)}
              </div>
            )}
            <span className="text-xl font-light tracking-wide">{w.business_name}</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm tracking-wide" style={{ color: '#7A7580' }}>
            {w.about_text && <a href="#about" className="hover:opacity-60 transition-opacity">Über uns</a>}
            {services.length > 0 && <a href="#services" className="hover:opacity-60 transition-opacity">Treatments</a>}
            {gallery.length > 0 && <a href="#gallery" className="hover:opacity-60 transition-opacity">Galerie</a>}
            <a href="#contact" className="hover:opacity-60 transition-opacity">Kontakt</a>
          </div>

          {buttons.length > 0 && (
            <a
              href={getButtonHref(buttons[0])}
              target={buttons[0].type === 'call' ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 text-white text-sm tracking-wide py-2.5 px-6 rounded-full transition-all hover:opacity-90 hover:shadow-lg"
              style={{ backgroundColor: primary, boxShadow: `0 4px 20px ${primary}30` }}
            >
              {buttons[0].label}
            </a>
          )}
        </div>
      </nav>

      {/* Floating Mobile CTA */}
      {buttons.length > 0 && (
        <a
          href={getButtonHref(buttons[0])}
          target={buttons[0].type === 'call' ? '_self' : '_blank'}
          rel="noopener noreferrer"
          className="md:hidden fixed bottom-6 right-6 z-50 py-3 px-6 rounded-full flex items-center gap-2 text-white font-medium transition-all hover:scale-105"
          style={{ backgroundColor: primary, boxShadow: `0 8px 30px ${primary}40` }}
        >
          {buttons[0].label}
        </a>
      )}

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-6 text-center overflow-hidden">
        {/* Soft decorative circles */}
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-30" style={{ backgroundColor: primary }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-20" style={{ backgroundColor: primary }} />

        <div className="max-w-3xl mx-auto relative">
          {/* Small decorative element */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-[1px]" style={{ backgroundColor: primary }} />
            <div className="w-2 h-2 rounded-full -mt-[3px] mx-3" style={{ backgroundColor: primary }} />
            <div className="w-16 h-[1px]" style={{ backgroundColor: primary }} />
          </div>

          <p className="text-sm uppercase tracking-[0.3em] mb-6" style={{ color: primary }}>
            {w.description || 'Willkommen'}
          </p>

          <h1 className="text-5xl md:text-7xl font-light leading-tight tracking-tight" style={{ color: '#2D2A32' }}>
            {w.hero_title || w.business_name}
          </h1>

          {w.hero_subtitle && (
            <p className="mt-6 text-lg font-light max-w-xl mx-auto leading-relaxed" style={{ color: '#7A7580' }}>
              {w.hero_subtitle}
            </p>
          )}

          {buttons.length > 0 && (
            <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
              {buttons.slice(0, 2).map((btn, i) => (
                <a
                  key={i}
                  href={getButtonHref(btn)}
                  target={btn.type === 'call' ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 py-4 px-10 rounded-full text-base tracking-wide transition-all hover:-translate-y-0.5 ${
                    i === 0 ? 'text-white hover:shadow-lg' : 'border'
                  }`}
                  style={i === 0 ? {
                    backgroundColor: primary,
                    boxShadow: `0 8px 30px ${primary}30`,
                  } : {
                    borderColor: `${primary}40`,
                    color: primary,
                  }}
                >
                  {btn.type === 'whatsapp' && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  )}
                  {btn.type === 'booking' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {btn.label}
                </a>
              ))}
            </div>
          )}

          {/* Decorative bottom element */}
          <div className="flex justify-center mt-16">
            <div className="w-24 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${primary}60, transparent)` }} />
          </div>
        </div>
      </section>

      {/* Angebote */}
      {activeOffers.length > 0 && (
        <section id="offers" className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Aktuell</p>
            <h2 className="text-3xl md:text-4xl font-light text-center mb-12 tracking-tight">Unsere Angebote</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {activeOffers.map((offer, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-8 text-center border"
                  style={{ backgroundColor: 'white', borderColor: `${primary}20` }}
                >
                  <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${primary}15` }}>
                    <svg className="w-5 h-5" style={{ color: primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{offer.title}</h3>
                  <p className="font-light" style={{ color: '#7A7580' }}>{offer.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Über uns */}
      {w.about_text && (
        <section id="about" className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Über uns</p>
            <h2 className="text-3xl md:text-4xl font-light mb-8 tracking-tight">Willkommen bei {w.business_name}</h2>
            <p className="text-lg font-light leading-relaxed" style={{ color: '#7A7580' }}>{w.about_text}</p>
          </div>
        </section>
      )}

      {/* Treatments/Services */}
      {services.length > 0 && (
        <section id="services" className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Treatments</p>
            <h2 className="text-3xl md:text-4xl font-light text-center mb-12 tracking-tight">Unsere Leistungen</h2>
            <div className="space-y-0">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-6 border-b"
                  style={{ borderColor: `${primary}15` }}
                >
                  <div>
                    <h3 className="font-medium text-lg">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm font-light mt-1" style={{ color: '#9A949F' }}>{service.description}</p>
                    )}
                  </div>
                  {service.price && (
                    <span className="font-light text-lg whitespace-nowrap ml-6" style={{ color: primary }}>
                      {service.price}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* CTA under services */}
            {buttons.some(b => b.type === 'booking') && (
              <div className="text-center mt-12">
                <a
                  href={getButtonHref(buttons.find(b => b.type === 'booking')!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 py-3.5 px-8 rounded-full text-white tracking-wide transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ backgroundColor: primary, boxShadow: `0 8px 30px ${primary}30` }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Jetzt Termin buchen
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Galerie */}
      {gallery.length > 0 && (
        <section id="gallery" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Einblicke</p>
            <h2 className="text-3xl md:text-4xl font-light text-center mb-12 tracking-tight">Galerie</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((img, i) => (
                <div key={i} className="rounded-2xl overflow-hidden aspect-square">
                  <img
                    src={img.url}
                    alt={img.caption || `Bild ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Kontakt & Öffnungszeiten */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm uppercase tracking-[0.3em] mb-3" style={{ color: primary }}>Kontakt</p>
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12 tracking-tight">Besuch uns</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {Object.keys(openingHours).length > 0 && (
              <div className="rounded-2xl p-8 border" style={{ backgroundColor: 'white', borderColor: `${primary}15` }}>
                <h3 className="font-medium tracking-wide mb-6" style={{ color: primary }}>Öffnungszeiten</h3>
                <div className="space-y-4">
                  {Object.entries(openingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="font-medium">{day}</span>
                      <span className="font-light" style={{ color: '#7A7580' }}>{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl p-8 border" style={{ backgroundColor: 'white', borderColor: `${primary}15` }}>
              <h3 className="font-medium tracking-wide mb-6" style={{ color: primary }}>So erreichst du uns</h3>
              <div className="space-y-5">
                {w.address && (
                  <a href={mapsLink || '#'} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}10`, color: primary }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: '#9A949F' }}>Adresse</p>
                      <p className="text-sm mt-0.5 group-hover:underline">{w.address}</p>
                    </div>
                  </a>
                )}

                {w.phone_display && (
                  <a href={`tel:${w.phone_display.replace(/[\s\-]/g, '')}`} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}10`, color: primary }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: '#9A949F' }}>Telefon</p>
                      <p className="text-sm mt-0.5 group-hover:underline">{w.phone_display}</p>
                    </div>
                  </a>
                )}

                {w.email && (
                  <a href={`mailto:${w.email}`} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}10`, color: primary }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: '#9A949F' }}>E-Mail</p>
                      <p className="text-sm mt-0.5 group-hover:underline">{w.email}</p>
                    </div>
                  </a>
                )}

                {buttons.some(b => b.type === 'whatsapp') && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: '#9A949F' }}>WhatsApp</p>
                      <p className="text-sm mt-0.5 text-[#25D366] group-hover:underline">Jetzt schreiben</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: `1px solid ${primary}15` }}>
        <div className="flex justify-center mb-4">
          <div className="w-8 h-[1px]" style={{ backgroundColor: `${primary}40` }} />
          <div className="w-1.5 h-1.5 rounded-full -mt-[2px] mx-2" style={{ backgroundColor: `${primary}40` }} />
          <div className="w-8 h-[1px]" style={{ backgroundColor: `${primary}40` }} />
        </div>
        <p className="text-sm font-light" style={{ color: '#9A949F' }}>
          &copy; {new Date().getFullYear()} {w.business_name}
        </p>
        <p className="text-xs mt-2" style={{ color: '#C8C4CC' }}>
          Erstellt mit Romy
        </p>
      </footer>
    </div>
  )
}
