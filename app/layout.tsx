import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Chi e chi',
  description: 'Conosci tutti gli invitati prima di arrivare',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Chi e chi' },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#FAFAFA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-gray-950 text-white min-h-screen antialiased">
        <main className="pb-12">
          {children}
        </main>
        <footer className="fixed bottom-0 inset-x-0 py-3 text-center text-xs text-gray-600 bg-gray-950/80 backdrop-blur-sm">
          By: <a href="https://mayraymarianofotografos.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 transition-colors">Mayra Manavella Fotografa</a>
        </footer>
      </body>
    </html>
  )
}
