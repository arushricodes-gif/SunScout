import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sun Scout ☀️ — Know Your Sunlight Before You Buy',
  description: 'Drop a pin on any property and see exactly where sunlight falls — hour by hour, season by season, with real 3D building shadows. Free solar path visualizer.',
  openGraph: {
    title: 'Sun Scout — Know Your Sunlight Before You Buy',
    description: 'Drop a pin on any property. See real 3D building shadows, sun path animation, and seasonal comparison. Free, no login.',
    url: 'https://sun-scout.com',
    siteName: 'Sun Scout',
    images: [{ url: 'https://sun-scout.com/og-image.png', width: 1200, height: 630, alt: 'Sun Scout — Solar path visualizer with 3D building shadows' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sun Scout — Know Your Sunlight Before You Buy',
    description: 'Drop a pin on any property. See real 3D building shadows and sun path animation. Free.',
    images: ['https://sun-scout.com/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}