import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Providers from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'VMAX Sales Analytics',
  description: 'Advanced sales analytics and management platform',
  icons: {
    icon: [
      { url: '/logo.PNG', sizes: '32x32', type: 'image/png' },
      { url: '/logo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/logo-192.png',
    apple: [
      { url: '/logo-192.png' },
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  themeColor: '#1e40af',
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VMAX Sales',
  },
  openGraph: {
    title: 'VMAX Sales Analytics',
    description: 'Advanced sales analytics and management platform',
    url: 'https://vmax-sales.vercel.app',
    siteName: 'VMAX Sales',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VMAX Sales Analytics',
    description: 'Advanced sales analytics and management platform',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  )
}
