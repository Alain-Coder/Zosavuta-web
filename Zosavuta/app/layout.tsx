import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Navigation from '@/components/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Zosavuta - Dashboard',
  description: 'Event management and ticketing dashboard.',
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex flex-col min-h-full">
            <Navigation />
            <main className="flex-grow">
              {children}
            </main>
          </div>
          <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
