import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'LeadGen',
  description: 'Search Google Places by area, category, and radius. Build and manage your local business lead pipeline.',
  icons: {
    icon: [
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    shortcut: '/icons/icon-32.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="h-full min-h-0 flex flex-col overflow-hidden bg-gray-50">
        <Navbar />
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
