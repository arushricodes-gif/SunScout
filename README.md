# ☀️ Sun Scout — Next.js

A solar path visualizer rebuilt in Next.js for Vercel deployment. Converted from the original Streamlit Python app.

## Features

- 📍 **Set Location** — Click any point on a Leaflet map
- 🌞 **Sun Path** — 3 views:
  - 🏙 **3D Shadow** — OSMBuildings with real building shadows + animated sun arc
  - 🗺 **2D View** — Leaflet map with sun position + shadow ray
  - 🌐 **Arc View** — Three.js 3D orbital arc visualization
- 🔄 **Year Summary** — All 4 seasons overlaid on the same map
- 📊 **Solar metrics** — Azimuth, elevation, radiation W/m², canvas elevation chart
- GPS auto-detection on load
- City search via Nominatim (OpenStreetMap)
- Celestial date presets (solstices, equinoxes)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS Variables |
| Solar math | Custom NOAA algorithm (pure JS — no Python) |
| 2D Maps | Leaflet 1.9 (via iframe) |
| 3D Buildings | OSMBuildings 4.1 (via iframe) |
| 3D Arc | Three.js r128 (via iframe) |
| Geocoding | Nominatim (OpenStreetMap) |
| Hosting | Vercel |

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option 2: GitHub + Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Vercel auto-detects Next.js — click Deploy

No environment variables required. All external APIs (Nominatim, OSMBuildings, Overpass) are called from the browser or edge functions without keys.

## Project Structure

```
sunscout/
├── app/
│   ├── api/
│   │   ├── solar/route.ts        # Solar calculations endpoint
│   │   ├── geocode/route.ts      # City search (Nominatim)
│   │   └── timezone/route.ts     # TZ offset lookup
│   ├── globals.css               # Design system CSS
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page + state
├── components/
│   ├── Sidebar.tsx               # Location/date controls
│   ├── TabGuide.tsx              # Getting Started tab
│   ├── TabExplorer.tsx           # Sun Scout tab
│   ├── Map2D.tsx                 # Leaflet 2D map
│   ├── Map3DShadow.tsx           # OSMBuildings 3D shadows
│   ├── Map3DCanvas.tsx           # Three.js arc view
│   ├── SeasonalMap.tsx           # 4-season Leaflet overlay
│   └── SolarChart.tsx            # Canvas elevation chart
├── lib/
│   └── solar.ts                  # NOAA solar position math
└── vercel.json
```

## Notes on the Conversion

- **Solar math**: The Python `astral` library is replaced by a pure TypeScript NOAA solar position algorithm in `lib/solar.ts`. Accuracy is within fractions of a degree.
- **Maps**: All map components use `<iframe srcDoc>` to render Leaflet/OSMBuildings/Three.js HTML, avoiding SSR issues and staying exactly faithful to the original.
- **AQI**: Removed (the original `enable_aqi = False` flag was already disabled).
- **Building obstruction**: The Overpass API building query runs live in the OSMBuildings iframe (same as original).
- **Timezone**: Uses `timeapi.io` for free timezone lookup by coordinates.
