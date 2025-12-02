# Task 09: Map View with Client-Side Filtering

## Goal

Build the home page with Mapbox map, listing grid, and client-side filtering using nuqs for URL state management.

## Implementation Steps

### 1. Home Page (Server Component)

Create `app/page.tsx`:

```typescript
import { Suspense } from 'react'
import { fetchAllListings } from '@/lib/api-client'
import { searchParamsCache } from '@/lib/search-params'
import { FilterSidebar } from '@/components/filters/filter-sidebar'
import { MapView } from '@/components/map/map-view'
import { ListingGrid } from '@/components/listings/listing-grid'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  // AI: Parse search params with nuqs
  const filters = searchParamsCache.parse(searchParams)

  // AI: Fetch all listings on server
  const listings = await fetchAllListings()

  return (
    <main className="flex h-screen">
      {/* AI: Sidebar with filters */}
      <aside className="w-96 border-r overflow-y-auto">
        <FilterSidebar listings={listings} />
      </aside>

      {/* AI: Main content area */}
      <div className="flex-1 flex flex-col">
        {/* AI: Map with streaming */}
        <Suspense fallback={<MapSkeleton />}>
          <MapView listings={listings} filters={filters} />
        </Suspense>

        {/* AI: Listing grid with filtering */}
        <Suspense fallback={<GridSkeleton />}>
          <ListingGrid listings={listings} filters={filters} />
        </Suspense>
      </div>
    </main>
  )
}

function MapSkeleton() {
  return <div className="h-1/2 bg-gray-100 animate-pulse" />
}

function GridSkeleton() {
  return <div className="h-1/2 bg-gray-50 animate-pulse" />
}
```

### 2. Filter Hooks with nuqs

Create `components/filters/use-filters.ts`:

```typescript
'use client'

import { useQueryStates } from 'nuqs'
import { searchParamsCache } from '@/lib/search-params'

export function useFilters() {
  const [filters, setFilters] = useQueryStates(searchParamsCache.parsers, {
    shallow: true, // AI: Don't trigger full page reload
    history: 'push', // AI: Add to browser history
  })

  return {
    filters,
    setFilters,

    // AI: Convenience methods
    setPrice: (min?: number, max?: number) => {
      setFilters({ price_min: min, price_max: max })
    },

    setLocation: (city?: string, ward?: string) => {
      setFilters({ city, ward })
    },

    toggleAmenity: (amenity: string) => {
      const current = filters.amenities || []
      const updated = current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity]
      setFilters({ amenities: updated })
    },

    toggleSmartTag: (tag: string) => {
      const current = filters.smart || []
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
      setFilters({ smart: updated })
    },

    clearAll: () => {
      setFilters({
        price_min: null,
        price_max: null,
        duration: '1',
        prefecture: null,
        city: null,
        ward: null,
        size_min: null,
        size_max: null,
        building_age: null,
        floor_min: null,
        amenities: null,
        smart: null,
      })
    },
  }
}
```

### 3. Filter Sidebar

Create `components/filters/filter-sidebar.tsx`:

```typescript
'use client'

import { useFilters } from './use-filters'
import { PriceRange } from './price-range'
import { SmartFilters } from './smart-filters'
import type { Listing } from '@japan-open-stays/types'

interface FilterSidebarProps {
  listings: Listing[]
}

export function FilterSidebar({ listings }: FilterSidebarProps) {
  const { filters, setFilters, clearAll } = useFilters()

  // AI: Extract unique cities for dropdown
  const cities = Array.from(new Set(listings.map(l => l.location.city))).sort()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Filters</h2>
        <button
          onClick={clearAll}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Clear all
        </button>
      </div>

      {/* AI: Duration selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Stay Duration
        </label>
        <select
          value={filters.duration}
          onChange={(e) => setFilters({ duration: e.target.value as any })}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="1">1 month</option>
          <option value="2">2 months</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
        </select>
      </div>

      {/* AI: Price range */}
      <PriceRange
        min={filters.price_min}
        max={filters.price_max}
        onChange={(min, max) => setFilters({ price_min: min, price_max: max })}
      />

      {/* AI: Location */}
      <div>
        <label className="block text-sm font-medium mb-2">City</label>
        <select
          value={filters.city || ''}
          onChange={(e) => setFilters({ city: e.target.value || null })}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">All cities</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* AI: Smart filters */}
      <SmartFilters
        selected={filters.smart || []}
        onChange={(smart) => setFilters({ smart })}
      />

      {/* AI: Amenities checkboxes */}
      <AmenitiesFilter />
    </div>
  )
}

function AmenitiesFilter() {
  const { filters, toggleAmenity } = useFilters()

  const amenities = [
    { value: 'wifi', label: '📶 WiFi' },
    { value: 'washer', label: '🧺 Washer' },
    { value: 'ac', label: '❄️ AC' },
    { value: 'balcony', label: '🌿 Balcony' },
    { value: 'parking', label: '🚗 Parking' },
    { value: 'desk', label: '💻 Desk' },
  ]

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Amenities</label>
      <div className="space-y-2">
        {amenities.map(amenity => (
          <label key={amenity.value} className="flex items-center">
            <input
              type="checkbox"
              checked={filters.amenities?.includes(amenity.value) || false}
              onChange={() => toggleAmenity(amenity.value)}
              className="mr-2"
            />
            <span>{amenity.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
```

### 4. Price Range Component

Create `components/filters/price-range.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

interface PriceRangeProps {
  min?: number
  max?: number
  onChange: (min?: number, max?: number) => void
}

export function PriceRange({ min, max, onChange }: PriceRangeProps) {
  const [localMin, setLocalMin] = useState(min?.toString() || '')
  const [localMax, setLocalMax] = useState(max?.toString() || '')

  // AI: Debounce updates to URL
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(
        localMin ? parseInt(localMin) : undefined,
        localMax ? parseInt(localMax) : undefined
      )
    }, 500)

    return () => clearTimeout(timeout)
  }, [localMin, localMax])

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Price Range (¥/month)
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="Min"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <span>-</span>
        <input
          type="number"
          placeholder="Max"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
    </div>
  )
}
```

### 5. Smart Filters Component

Create `components/filters/smart-filters.tsx`:

```typescript
'use client'

import type { SmartTag } from '@japan-open-stays/types'

interface SmartFiltersProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function SmartFilters({ selected, onChange }: SmartFiltersProps) {
  const smartTags: { value: SmartTag; label: string; icon: string }[] = [
    { value: 'near_transit', label: 'Near Transit', icon: '🚇' },
    { value: 'quiet_neighborhood', label: 'Quiet Area', icon: '🌳' },
    { value: 'foreigner_friendly', label: 'Foreigner-Friendly', icon: '🌍' },
    { value: 'natural_light', label: 'Natural Light', icon: '☀️' },
    { value: 'modern_interior', label: 'Modern', icon: '✨' },
    { value: 'wfh_suitable', label: 'WFH Suitable', icon: '💼' },
    { value: 'pet_indicators', label: 'Pet-Friendly', icon: '🐾' },
  ]

  function toggleTag(tag: string) {
    const updated = selected.includes(tag)
      ? selected.filter(t => t !== tag)
      : [...selected, tag]
    onChange(updated)
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        ✨ Smart Filters
      </label>
      <div className="flex flex-wrap gap-2">
        {smartTags.map(tag => (
          <button
            key={tag.value}
            onClick={() => toggleTag(tag.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selected.includes(tag.value)
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{tag.icon}</span>
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

### 6. Mapbox Map Component

Create `components/map/mapbox-map.tsx`:

```typescript
'use client'

import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Listing } from '@japan-open-stays/types'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface MapboxMapProps {
  listings: Listing[]
}

export function MapboxMap({ listings }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // AI: Initialize map centered on Tokyo
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [139.6917, 35.6895], // AI: Tokyo coordinates
      zoom: 11,
    })

    map.current.addControl(new mapboxgl.NavigationControl())

    return () => {
      map.current?.remove()
    }
  }, [])

  // AI: Update markers when listings change
  useEffect(() => {
    if (!map.current) return

    // AI: Clear existing markers
    const markers = document.querySelectorAll('.listing-marker')
    markers.forEach(m => m.remove())

    // AI: Add marker for each listing
    listings.forEach(listing => {
      if (!listing.location.lat || !listing.location.lng) return

      const el = document.createElement('div')
      el.className = 'listing-marker'
      el.style.width = '30px'
      el.style.height = '30px'
      el.style.borderRadius = '50%'
      el.style.backgroundColor = '#ef4444'
      el.style.cursor = 'pointer'

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="p-2">
          <h3 class="font-bold">${listing.title_en}</h3>
          <p class="text-sm">${listing.location.ward}</p>
          <p class="text-sm font-bold">¥${listing.total_costs.short_1month.toLocaleString()}/month</p>
          <a href="/stays/${listing.listing_id}" class="text-blue-500 text-sm">View details →</a>
        </div>`
      )

      new mapboxgl.Marker(el)
        .setLngLat([listing.location.lng, listing.location.lat])
        .setPopup(popup)
        .addTo(map.current!)
    })
  }, [listings])

  return <div ref={mapContainer} className="h-full w-full" />
}
```

Create `components/map/map-view.tsx`:

```typescript
'use client'

import { MapboxMap } from './mapbox-map'
import { filterListings } from '@/lib/filter-logic'
import type { Listing, Filters } from '@japan-open-stays/types'

interface MapViewProps {
  listings: Listing[]
  filters: Filters
}

export function MapView({ listings, filters }: MapViewProps) {
  // AI: Filter listings client-side
  const filteredListings = filterListings(listings, filters)

  return (
    <div className="h-1/2 relative">
      <MapboxMap listings={filteredListings} />

      {/* AI: Result count overlay */}
      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-lg">
        <p className="text-sm font-medium">
          {filteredListings.length} properties found
        </p>
      </div>
    </div>
  )
}
```

### 7. Listing Grid

Create `components/listings/listing-grid.tsx`:

```typescript
'use client'

import { filterListings, sortListings } from '@/lib/filter-logic'
import { ListingCard } from './listing-card'
import type { Listing, Filters } from '@japan-open-stays/types'

interface ListingGridProps {
  listings: Listing[]
  filters: Filters
}

export function ListingGrid({ listings, filters }: ListingGridProps) {
  // AI: Filter and sort listings
  const filtered = filterListings(listings, filters)
  const sorted = sortListings(filtered, 'price', filters.duration)

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium text-gray-600">No listings found</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map(listing => (
          <ListingCard
            key={listing.listing_id}
            listing={listing}
            duration={filters.duration}
          />
        ))}
      </div>
    </div>
  )
}
```

### 8. Listing Card

Create `components/listings/listing-card.tsx`:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import type { Listing } from '@japan-open-stays/types'

interface ListingCardProps {
  listing: Listing
  duration: string
}

export function ListingCard({ listing, duration }: ListingCardProps) {
  const price = getTotalCost(listing, duration)
  const mainImage = listing.images[0] || '/placeholder.jpg'

  return (
    <Link href={`/stays/${listing.listing_id}`}>
      <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
        {/* AI: Image */}
        <div className="relative h-48">
          <Image
            src={mainImage}
            alt={listing.title_en}
            fill
            className="object-cover"
          />
        </div>

        {/* AI: Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1">
            {listing.title_en}
          </h3>

          <p className="text-sm text-gray-600 mb-2">
            {listing.location.ward} • {listing.building_info.floor_plan}
          </p>

          {/* AI: Smart tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.smart_tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {tag.replace('_', ' ')}
              </span>
            ))}
          </div>

          {/* AI: Price */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold">
                ¥{price.toLocaleString()}
              </span>
              <span className="text-sm text-gray-600 ml-1">
                /{duration}mo
              </span>
            </div>

            <span className="text-sm text-gray-500">
              {listing.building_info.floor_area_sqm}m²
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function getTotalCost(listing: Listing, duration: string): number {
  const key = `short_${duration}month` as keyof typeof listing.total_costs
  return listing.total_costs[key] || 0
}
```

## Verification

- [ ] Home page loads with all listings
- [ ] Map displays markers for filtered listings
- [ ] Filters update URL params with nuqs
- [ ] Client-side filtering is instant
- [ ] Price range filter works
- [ ] Smart filters toggle correctly
- [ ] Listing cards display properly
- [ ] Clicking marker shows popup
- [ ] Filter changes update map and grid simultaneously
- [ ] No page reloads when changing filters

## Dependencies

- Task 08: Next.js setup

## Next Task

Task 10: Create listing detail pages



