# Task 08: Next.js 16 Frontend Setup

## Goal

Set up Next.js 16 with App Router, PPR, React Compiler, Turbopack, Tailwind CSS, Mapbox, and nuqs.

## Implementation Steps

### 1. Create Next.js App

```bash
cd apps
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

### 2. Install Dependencies

```bash
cd web
pnpm add nuqs mapbox-gl
pnpm add react-map-gl @types/mapbox-gl
pnpm add @japan-open-stays/types
pnpm add -D @babel/plugin-react-compiler babel-plugin-react-compiler
```

### 3. Configure Next.js

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    ppr: true, // AI: Partial Pre-rendering
    reactCompiler: true, // AI: React Compiler
    turbo: {
      // AI: Turbopack config
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // AI: Environment variables
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN!,
  },

  // AI: Image optimization
  images: {
    domains: ['www.weekly-mansion.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // AI: Enable compression
  compress: true,
}

export default nextConfig
```

### 4. Configure React Compiler

Create `babel.config.js`:

```javascript
module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'babel-plugin-react-compiler',
      {
        runtimeModule: 'react-compiler-runtime',
      },
    ],
  ],
}
```

### 5. Project Structure

```
apps/web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Map search
│   ├── loading.tsx
│   ├── error.tsx
│   ├── stays/
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── loading.tsx
│   └── compare/
│       └── page.tsx
├── components/
│   ├── map/
│   │   ├── mapbox-map.tsx
│   │   └── map-marker.tsx
│   ├── filters/
│   │   ├── filter-sidebar.tsx
│   │   ├── price-range.tsx
│   │   ├── smart-filters.tsx
│   │   └── use-filters.ts
│   ├── listings/
│   │   ├── listing-card.tsx
│   │   ├── listing-grid.tsx
│   │   └── listing-detail.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── select.tsx
├── lib/
│   ├── api-client.ts
│   ├── filter-logic.ts
│   ├── search-params.ts
│   └── local-storage.ts
└── styles/
    └── globals.css
```

### 6. Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [],
}

export default config
```

Update `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer components {
  .mapboxgl-popup {
    @apply max-w-xs;
  }
}
```

### 7. Root Layout

Update `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Japan Open Stays - Find Your Perfect Tokyo Rental',
  description: 'Search and compare short-term rentals across Tokyo with smart filters and AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
      </body>
    </html>
  )
}
```

### 8. API Client

Create `lib/api-client.ts`:

```typescript
import type {
  Listing,
  ListingsResponse,
  LocationsResponse,
} from '@japan-open-stays/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

export async function fetchAllListings(): Promise<Listing[]> {
  const response = await fetch(`${API_URL}/listings`, {
    next: { revalidate: 3600 }, // AI: Revalidate every hour
  })

  if (!response.ok) {
    throw new Error('Failed to fetch listings')
  }

  const data: ListingsResponse = await response.json()
  return data.listings
}

export async function fetchListingById(id: string): Promise<Listing> {
  const response = await fetch(`${API_URL}/listings/${id}`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch listing')
  }

  const data = await response.json()
  return data.listing
}

export async function fetchLocations(): Promise<LocationsResponse> {
  const response = await fetch(`${API_URL}/locations`, {
    next: { revalidate: 86400 }, // AI: Revalidate daily
  })

  if (!response.ok) {
    throw new Error('Failed to fetch locations')
  }

  return response.json()
}
```

### 9. Search Params with nuqs

Create `lib/search-params.ts`:

```typescript
import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
} from 'nuqs'

export const searchParamsCache = createSearchParamsCache({
  // AI: Price filters
  price_min: parseAsInteger,
  price_max: parseAsInteger,
  duration: parseAsStringEnum(['1', '2', '3', '6', '12']).withDefault('1'),

  // AI: Location filters
  prefecture: parseAsString,
  city: parseAsString,
  ward: parseAsString,

  // AI: Property filters
  size_min: parseAsInteger,
  size_max: parseAsInteger,
  building_age: parseAsStringEnum(['new', 'less_5yr', 'less_10yr', 'any']),
  floor_min: parseAsInteger,

  // AI: Amenities
  amenities: parseAsArrayOf(parseAsString, ','),

  // AI: Smart filters
  smart: parseAsArrayOf(parseAsString, ','),
})

export type SearchParams = ReturnType<typeof searchParamsCache.parse>
```

Create `lib/filter-logic.ts`:

```typescript
import type { Listing, Filters } from '@japan-open-stays/types'

export function filterListings(
  listings: Listing[],
  filters: Filters
): Listing[] {
  return listings.filter((listing) => {
    // AI: Price filter
    if (filters.price_min || filters.price_max) {
      const price = getTotalCostForDuration(listing, filters.duration)
      if (filters.price_min && price < filters.price_min) return false
      if (filters.price_max && price > filters.price_max) return false
    }

    // AI: Location filters
    if (
      filters.prefecture &&
      listing.location.prefecture !== filters.prefecture
    )
      return false
    if (filters.city && listing.location.city !== filters.city) return false
    if (filters.ward && listing.location.ward !== filters.ward) return false

    // AI: Size filters
    if (
      filters.size_min &&
      listing.building_info.floor_area_sqm < filters.size_min
    )
      return false
    if (
      filters.size_max &&
      listing.building_info.floor_area_sqm > filters.size_max
    )
      return false

    // AI: Building age filter
    if (filters.building_age) {
      const age = listing.building_info.building_age_years
      if (filters.building_age === 'new' && age > 0) return false
      if (filters.building_age === 'less_5yr' && age >= 5) return false
      if (filters.building_age === 'less_10yr' && age >= 10) return false
    }

    // AI: Floor filter
    if (
      filters.floor_min &&
      listing.building_info.floors_total < filters.floor_min
    )
      return false

    // AI: Amenities filter (all must match)
    if (filters.amenities?.length) {
      const allAmenities = Object.values(listing.equipment).flat()
      const hasAllAmenities = filters.amenities.every((amenity) =>
        allAmenities.some((a) => a.includes(amenity))
      )
      if (!hasAllAmenities) return false
    }

    // AI: Smart tags filter
    if (filters.smart?.length) {
      const hasAllTags = filters.smart.every((tag) =>
        listing.smart_tags.includes(tag as any)
      )
      if (!hasAllTags) return false
    }

    return true
  })
}

function getTotalCostForDuration(listing: Listing, duration: string): number {
  const key = `short_${duration}month` as keyof typeof listing.total_costs
  return listing.total_costs[key] || 0
}

export function sortListings(
  listings: Listing[],
  sortBy: 'price' | 'age' | 'size',
  duration: string = '1'
): Listing[] {
  return [...listings].sort((a, b) => {
    if (sortBy === 'price') {
      return (
        getTotalCostForDuration(a, duration) -
        getTotalCostForDuration(b, duration)
      )
    }
    if (sortBy === 'age') {
      return (
        a.building_info.building_age_years - b.building_info.building_age_years
      )
    }
    if (sortBy === 'size') {
      return b.building_info.floor_area_sqm - a.building_info.floor_area_sqm
    }
    return 0
  })
}
```

### 10. Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Create `.env.example`:

```bash
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

### 11. Update package.json Scripts

Update `apps/web/package.json`:

```json
{
  "name": "@japan-open-stays/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### 12. TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Testing

```bash
# AI: Run development server with Turbopack
pnpm dev

# AI: Build for production
pnpm build

# AI: Check for type errors
pnpm type-check
```

## Verification

- [ ] Next.js 16 runs with Turbopack
- [ ] PPR is enabled in config
- [ ] React Compiler is working
- [ ] Tailwind CSS styles apply correctly
- [ ] nuqs is configured
- [ ] API client can fetch from backend
- [ ] Environment variables are set
- [ ] Build completes without errors

## Dependencies

- Task 01: Monorepo setup
- Task 02: Shared types
- Task 05: Deployed API

## Next Task

Task 09: Build map view with client-side filtering
