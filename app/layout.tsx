import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import ThemeWrapper from '@/components/theme-wrapper';
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { ScrollToTop } from '@/components/scroll-to-top'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Zosavuta - Your Gateway to Events',
  description: 'Discover and book tickets for amazing events. Seamless ticketing with integrated bus transport across Africa.',
  generator: 'Zosavuta',
  icons: {
    icon: '/zosavuta.png',
    apple: '/zosavuta.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="font-sans antialiased h-full">
        <div className="flex flex-col min-h-full">
          <Navigation />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
