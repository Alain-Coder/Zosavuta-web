import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zosavuta.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Zosavuta | Ticket Yako, M'manja Mwako",
    template: '%s | Zosavuta',
  },

  description:
    "Discover events, buy secure tickets, and experience events with less stress. Zosavuta connects Malawians with concerts, festivals, sports, conferences, and more, while giving organizers the tools to sell, manage, and grow their events.",

  applicationName: 'Zosavuta',
  generator: 'Zosavuta',

  keywords: [
    'Zosavuta',
    'Malawi events',
    'Malawi event tickets',
    'buy tickets Malawi',
    'event tickets Malawi',
    'events in Malawi',
    'Lilongwe events',
    'Blantyre events',
    'Malawi concerts',
    'Malawi festivals',
    'ticket resale Malawi',
    'ticket marketplace Malawi',
    'digital ticketing Malawi',
    'event ticketing platform',
    'event management Malawi',
    'MarketWeb Digital Marketing',
  ],

  authors: [
    { name: 'MarketWeb Digital Marketing' },
    { name: 'SenLain Systems Limited' },
  ],

  creator: 'MarketWeb Digital Marketing & SenLain Systems Limited',
  publisher: 'Zosavuta',
  category: 'Events & Ticketing',

  alternates: {
    canonical: '/',
  },

  openGraph: {
    type: 'website',
    locale: 'en_MW',
    url: siteUrl,
    siteName: 'Zosavuta',

    title: "Zosavuta | Ticket Yako, M'manja Mwako",

    description:
      "Find events you love, get your tickets securely, and enjoy a simpler experience from booking to the gate. Zosavuta connects event organizers and audiences across Malawi.",

    images: [
      {
        url: '/zosavuta.png',
        width: 800,
        height: 800,
        alt: "Zosavuta - Ticket Yako, M'manja Mwako",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',

    title: "Zosavuta | Ticket Yako, M'manja Mwako",

    description:
      "Discover events, buy secure tickets, and enjoy a simpler way to experience events in Malawi. Find your next event or sell tickets for your own.",

    images: ['/zosavuta.png'],
    creator: '@zosavuta',
  },

  icons: {
    icon: [
      { url: '/zosavuta.png', sizes: 'any' },
      { url: '/zosavuta.png', type: 'image/png' },
    ],
    apple: [
      { url: '/zosavuta.png' },
    ],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',

  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'Zosavuta',
      url: siteUrl,
      logo: `${siteUrl}/zosavuta.png`,
      slogan: "Ticket Yako, M'manja Mwako",

      description:
        "Zosavuta is a Malawian e-ticketing and event marketplace that connects event organizers with the public, making it easier to discover, buy, manage, and resell tickets securely.",

      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Lilongwe',
        addressCountry: 'MW',
      },
    },

    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Zosavuta',

      description:
        "A simpler way to discover events, buy secure tickets, and connect with events across Malawi.",

      publisher: {
        '@id': `${siteUrl}/#organization`,
      },

      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      </head>

      <body className="font-sans antialiased h-full">
        <div className="flex flex-col min-h-full">
          <Navigation />

          <main className="flex-grow">
            {children}
          </main>

          <Footer />
        </div>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

