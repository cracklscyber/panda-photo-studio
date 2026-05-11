'use client'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function WhatsAppLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        window.fbq?.('track', 'Contact', { content_name: 'whatsapp_click' })
      }}
    >
      {children}
    </a>
  )
}
