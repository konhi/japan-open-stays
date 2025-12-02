# Task 10: Listing Detail Pages

## Goal

Create server-rendered listing detail pages with image galleries, price breakdowns, amenities, and comparison functionality.

## Implementation Steps

### 1. Dynamic Route Page

Create `app/stays/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { fetchListingById } from '@/lib/api-client'
import { ImageGallery } from '@/components/listings/image-gallery'
import { PriceBreakdown } from '@/components/listings/price-breakdown'
import { AmenitiesGrid } from '@/components/listings/amenities-grid'
import { LocationMap } from '@/components/listings/location-map'
import { SaveToCompare } from '@/components/listings/save-to-compare'
import { SmartTagBadges } from '@/components/listings/smart-tag-badges'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps) {
  const listing = await fetchListingById(params.id)

  return {
    title: `${listing.title_en} - Japan Open Stays`,
    description: listing.description_en,
  }
}

export default async function ListingDetailPage({ params }: PageProps) {
  let listing

  try {
    listing = await fetchListingById(params.id)
  } catch (error) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* AI: Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-gray-600 hover:text-gray-900">
              ← Back to search
            </a>
            <SaveToCompare listingId={listing.listing_id} />
          </div>
        </div>
      </div>

      {/* AI: Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AI: Title and location */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{listing.title_en}</h1>
          <p className="text-gray-600">
            {listing.location.address_full}
          </p>

          {/* AI: Smart tags */}
          <SmartTagBadges tags={listing.smart_tags} />
        </div>

        {/* AI: Image gallery with streaming */}
        <Suspense fallback={<GallerySkeleton />}>
          <ImageGallery images={listing.images} />
        </Suspense>

        {/* AI: Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* AI: Left column - details */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI: Description */}
            <section>
              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {listing.description_en}
              </p>
            </section>

            {/* AI: Building info */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Property Details</h2>
              <PropertyDetails listing={listing} />
            </section>

            {/* AI: Access routes */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Access</h2>
              <AccessRoutes routes={listing.location.access_routes} />
            </section>

            {/* AI: Amenities */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Amenities & Features</h2>
              <AmenitiesGrid equipment={listing.equipment} />
            </section>

            {/* AI: Map */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Location</h2>
              <LocationMap
                lat={listing.location.lat}
                lng={listing.location.lng}
                title={listing.title_en}
              />
            </section>
          </div>

          {/* AI: Right column - price sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <PriceBreakdown listing={listing} />

              {/* AI: View original link */}
              <a
                href={listing.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-4 w-full text-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                View on weekly-mansion.com →
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function GallerySkeleton() {
  return <div className="w-full h-96 bg-gray-200 animate-pulse rounded-lg" />
}

function PropertyDetails({ listing }: { listing: any }) {
  const details = [
    { label: 'Floor Plan', value: listing.building_info.floor_plan },
    { label: 'Floor Area', value: `${listing.building_info.floor_area_sqm}m²` },
    { label: 'Max Capacity', value: `${listing.building_info.max_capacity} people` },
    { label: 'Building Age', value: `${listing.building_info.building_age_years} years` },
    { label: 'Structure', value: listing.building_info.structure },
    { label: 'Total Floors', value: listing.building_info.floors_total },
    { label: 'Parking', value: listing.building_info.parking_available ? 'Available' : 'Not available' },
    { label: 'Min Contract', value: `${listing.building_info.min_contract_days} days` },
  ]

  return (
    <dl className="grid grid-cols-2 gap-4">
      {details.map(({ label, value }) => (
        <div key={label} className="border-b pb-2">
          <dt className="text-sm text-gray-600">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function AccessRoutes({ routes }: { routes: any[] }) {
  return (
    <div className="space-y-3">
      {routes.map((route, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
          <span className="text-2xl">🚇</span>
          <div>
            <p className="font-medium">
              {route.line} - {route.station}
            </p>
            <p className="text-sm text-gray-600">
              {route.bus_name ? (
                <>
                  Bus {route.bus_name} ({route.bus_minutes} min) + Walk {route.bus_walk_minutes} min
                </>
              ) : (
                <>Walk {route.walk_minutes} minutes</>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### 2. Image Gallery Component

Create `components/listings/image-gallery.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ImageGalleryProps {
  images: string[]
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No images available</p>
      </div>
    )
  }

  return (
    <>
      {/* AI: Main image */}
      <div
        className="relative w-full h-96 rounded-lg overflow-hidden cursor-pointer"
        onClick={() => setIsLightboxOpen(true)}
      >
        <Image
          src={images[selectedIndex]}
          alt={`Property image ${selectedIndex + 1}`}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* AI: Thumbnail grid */}
      <div className="grid grid-cols-6 gap-2 mt-4">
        {images.slice(0, 12).map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`relative h-20 rounded overflow-hidden ${
              index === selectedIndex ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {/* AI: Lightbox */}
      {isLightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={selectedIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  )
}

function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  function handlePrev() {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          handlePrev()
        }}
        className="absolute left-4 text-white text-4xl hover:scale-110 transition"
      >
        ‹
      </button>

      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          fill
          className="object-contain"
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          handleNext()
        }}
        className="absolute right-4 text-white text-4xl hover:scale-110 transition"
      >
        ›
      </button>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl hover:scale-110 transition"
      >
        ×
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}
```

### 3. Price Breakdown Component

Create `components/listings/price-breakdown.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Listing } from '@japan-open-stays/types'

interface PriceBreakdownProps {
  listing: Listing
}

export function PriceBreakdown({ listing }: PriceBreakdownProps) {
  const [duration, setDuration] = useState<'1' | '2' | '3' | '6'>('1')

  const tier = duration === '1' || duration === '2' ? 'short' : duration === '3' ? 'middle' : 'long'
  const pricing = listing.pricing_tiers[tier]
  const totalCostKey = `${tier}_${duration}month` as keyof typeof listing.total_costs
  const totalCost = listing.total_costs[totalCostKey]

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Pricing</h3>

      {/* AI: Duration selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Stay Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as any)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="1">1 month</option>
          <option value="2">2 months</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
        </select>
      </div>

      {/* AI: Price breakdown table */}
      <table className="w-full text-sm mb-4">
        <tbody className="divide-y">
          <tr>
            <td className="py-2 text-gray-600">Rent ({duration} month{duration !== '1' ? 's' : ''})</td>
            <td className="py-2 text-right font-medium">
              ¥{(pricing.rent_per_month * parseInt(duration)).toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-gray-600">Utilities</td>
            <td className="py-2 text-right font-medium">
              ¥{(pricing.utilities_per_month * parseInt(duration)).toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-gray-600">Cleaning fee</td>
            <td className="py-2 text-right font-medium">
              ¥{pricing.cleaning_fee.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-gray-600">Bedding fee</td>
            <td className="py-2 text-right font-medium">
              ¥{listing.other_fees.bedding_fee.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* AI: Total */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-baseline">
          <span className="text-gray-600">Total</span>
          <div className="text-right">
            <div className="text-3xl font-bold">
              ¥{totalCost.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              ¥{Math.round(totalCost / parseInt(duration)).toLocaleString()}/month
            </div>
          </div>
        </div>
      </div>

      {/* AI: Other fees note */}
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        <p>Additional fees may apply:</p>
        <ul className="list-disc list-inside mt-1">
          {listing.other_fees.re_contract_guarantee_fee > 0 && (
            <li>Re-contract fee: ¥{listing.other_fees.re_contract_guarantee_fee.toLocaleString()}</li>
          )}
          {listing.other_fees.additional_person_utilities_per_day > 0 && (
            <li>Extra person: ¥{listing.other_fees.additional_person_utilities_per_day}/day</li>
          )}
        </ul>
      </div>
    </div>
  )
}
```

### 4. Amenities Grid

Create `components/listings/amenities-grid.tsx`:

```typescript
import type { Equipment } from '@japan-open-stays/types'

interface AmenitiesGridProps {
  equipment: Equipment
}

export function AmenitiesGrid({ equipment }: AmenitiesGridProps) {
  const categories = [
    { key: 'electronics' as keyof Equipment, label: 'Electronics', icon: '⚡' },
    { key: 'furniture' as keyof Equipment, label: 'Furniture', icon: '🛋️' },
    { key: 'kitchen' as keyof Equipment, label: 'Kitchen', icon: '🍳' },
    { key: 'bath_toilet' as keyof Equipment, label: 'Bath & Toilet', icon: '🚿' },
    { key: 'building_features' as keyof Equipment, label: 'Building', icon: '🏢' },
    { key: 'room_features' as keyof Equipment, label: 'Room Features', icon: '✨' },
  ]

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const items = equipment[category.key]
        if (!items || items.length === 0) return null

        return (
          <div key={category.key}>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded text-sm"
                >
                  <span className="text-green-500">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

### 5. Location Map

Create `components/listings/location-map.tsx`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface LocationMapProps {
  lat: number
  lng: number
  title: string
}

export function LocationMap({ lat, lng, title }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: 15,
    })

    // AI: Add marker for listing
    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3 class="font-bold">${title}</h3>`))
      .addTo(map.current)

    map.current.addControl(new mapboxgl.NavigationControl())

    return () => {
      map.current?.remove()
    }
  }, [lat, lng, title])

  return <div ref={mapContainer} className="w-full h-96 rounded-lg" />
}
```

### 6. Save to Compare

Create `components/listings/save-to-compare.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { addToComparison, removeFromComparison, isInComparison } from '@/lib/local-storage'

interface SaveToCompareProps {
  listingId: string
}

export function SaveToCompare({ listingId }: SaveToCompareProps) {
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    setIsSaved(isInComparison(listingId))
  }, [listingId])

  function handleToggle() {
    if (isSaved) {
      removeFromComparison(listingId)
      setIsSaved(false)
    } else {
      addToComparison(listingId)
      setIsSaved(true)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-4 py-2 rounded-lg border transition ${
        isSaved
          ? 'bg-primary-500 text-white border-primary-500'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {isSaved ? '✓ Added to compare' : '+ Add to compare'}
    </button>
  )
}
```

### 7. Smart Tag Badges

Create `components/listings/smart-tag-badges.tsx`:

```typescript
import type { SmartTag } from '@japan-open-stays/types'

interface SmartTagBadgesProps {
  tags: SmartTag[]
}

const tagLabels: Record<SmartTag, string> = {
  near_transit: '🚇 Near Transit',
  quiet_neighborhood: '🌳 Quiet Area',
  foreigner_friendly: '🌍 Foreigner-Friendly',
  natural_light: '☀️ Natural Light',
  modern_interior: '✨ Modern',
  wfh_suitable: '💼 WFH Suitable',
  pet_indicators: '🐾 Pet-Friendly',
}

export function SmartTagBadges({ tags }: SmartTagBadgesProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {tags.map(tag => (
        <span
          key={tag}
          className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
        >
          {tagLabels[tag]}
        </span>
      ))}
    </div>
  )
}
```

### 8. Local Storage Utilities

Create `lib/local-storage.ts`:

```typescript
const COMPARISON_KEY = 'japan-open-stays-comparison'

export function getComparison(): string[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem(COMPARISON_KEY)
  return stored ? JSON.parse(stored) : []
}

export function addToComparison(listingId: string): void {
  const current = getComparison()

  // AI: Limit to 5 listings
  if (current.length >= 5) {
    alert('You can compare up to 5 listings at once')
    return
  }

  if (!current.includes(listingId)) {
    const updated = [...current, listingId]
    localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated))
  }
}

export function removeFromComparison(listingId: string): void {
  const current = getComparison()
  const updated = current.filter((id) => id !== listingId)
  localStorage.setItem(COMPARISON_KEY, JSON.stringify(updated))
}

export function isInComparison(listingId: string): boolean {
  return getComparison().includes(listingId)
}

export function clearComparison(): void {
  localStorage.removeItem(COMPARISON_KEY)
}
```

### 9. Loading State

Create `app/stays/[id]/loading.tsx`:

```typescript
export default function ListingLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-96 bg-gray-200 rounded mb-8" />
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

## Verification

- [ ] Detail pages load with correct data
- [ ] Image gallery displays all photos
- [ ] Lightbox works correctly
- [ ] Price breakdown calculates correctly
- [ ] Amenities are categorized properly
- [ ] Map displays correct location
- [ ] Save to compare works with localStorage
- [ ] Smart tags display with labels
- [ ] Loading state shows while fetching
- [ ] 404 page shows for invalid IDs

## Dependencies

- Task 09: Map and filters

## Next Task

Task 11: Implement compare feature
