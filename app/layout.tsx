import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Sun Scout ☀️ — Free Sun Path Visualizer for Any Property',
  description: 'Free sun path visualizer — drop a pin and see exactly where sunlight falls hour by hour, season by season, with real 3D building shadows. Check sunlight before buying or renting a home.',
  keywords: [
    'sun path visualizer',
    'solar path visualizer',
    'sunlight map',
    'sun tracker map',
    'check sunlight apartment',
    'sun path calculator',
    'shadow map buildings',
    'sunlight hours property',
    'solar angle map',
    'sun position map',
    'how much sunlight does my house get',
    'check sun exposure before buying home',
    'sun path animation',
    '3D shadow map',
    'seasonal sunlight tracker',
  ],
  openGraph: {
    title: 'Sun Scout — Free Sun Path Visualizer for Any Property',
    description: 'Drop a pin on any property. See real 3D building shadows, sun path animation, and seasonal comparison. Free, no login.',
    url: 'https://sun-scout.com',
    siteName: 'Sun Scout',
    images: [{ url: 'https://sun-scout.com/og-image.jpg', width: 1200, height: 630, alt: 'Sun Scout — Solar path visualizer with 3D building shadows' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sun Scout — Free Sun Path Visualizer for Any Property',
    description: 'Drop a pin on any property. See real 3D building shadows and sun path animation. Free.',
    images: ['https://sun-scout.com/og-image.jpg'],
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
