import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Local Lead Search',
  description: 'Search Google Places by area, category, and radius',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
