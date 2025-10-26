# Task 11: Compare Feature

## Goal

Create a comparison page where users can view saved listings side-by-side and compare prices, amenities, and features.

## Implementation Steps

### 1. Compare Page

Create `app/compare/page.tsx`:

```typescript
import { fetchListingById } from '@/lib/api-client'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { ComparisonHeader } from '@/components/compare/comparison-header'
import { notFound } from 'next/navigation'

interface PageProps {
  searchParams: { ids?: string }
}

export const metadata = {
  title: 'Compare Listings - Japan Open Stays',
  description: 'Compare short-term rentals side-by-side',
}

export default async function ComparePage({ searchParams }: PageProps) {
  // AI: Get listing IDs from URL (fallback to empty if SSR)
  const ids = searchParams.ids?.split(',').filter(Boolean) || []

  if (ids.length === 0) {
    return <EmptyState />
  }

  // AI: Fetch all listings in parallel
  const listings = await Promise.all(
    ids.map(async (id) => {
      try {
        return await fetchListingById(id)
      } catch {
        return null
      }
    })
  )

  // AI: Filter out failed fetches
  const validListings = listings.filter(Boolean)

  if (validListings.length === 0) {
    return <EmptyState />
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <ComparisonHeader count={validListings.length} />
      <ComparisonTable listings={validListings} />
    </main>
  )
}

function EmptyState() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">No listings to compare</h1>
        <p className="text-gray-600 mb-6">
          Add listings to your comparison from the search page or detail pages
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          Browse listings
        </a>
      </div>
    </main>
  )
}
```

### 2. Client Wrapper for localStorage

Create `app/compare/layout.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getComparison } from '@/lib/local-storage'

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // AI: Sync URL with localStorage on mount
    const ids = getComparison()
    const currentUrl = new URL(window.location.href)
    const urlIds = currentUrl.searchParams.get('ids')?.split(',') || []

    if (JSON.stringify(ids) !== JSON.stringify(urlIds)) {
      if (ids.length === 0) {
        router.push('/compare')
      } else {
        router.push(`/compare?ids=${ids.join(',')}`)
      }
    }
  }, [])

  return <>{children}</>
}
```

### 3. Comparison Header

Create `components/compare/comparison-header.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { clearComparison } from '@/lib/local-storage'

interface ComparisonHeaderProps {
  count: number
}

export function ComparisonHeader({ count }: ComparisonHeaderProps) {
  const router = useRouter()

  function handleClearAll() {
    if (confirm('Remove all listings from comparison?')) {
      clearComparison()
      router.push('/compare')
    }
  }

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <a href="/" className="text-gray-600 hover:text-gray-900">
              ← Back to search
            </a>
            <h1 className="text-2xl font-bold mt-2">
              Comparing {count} {count === 1 ? 'listing' : 'listings'}
            </h1>
          </div>

          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4. Comparison Table

Create `components/compare/comparison-table.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { removeFromComparison, getComparison } from '@/lib/local-storage'
import type { Listing } from '@japan-open-stays/types'

interface ComparisonTableProps {
  listings: Listing[]
}

export function ComparisonTable({ listings }: ComparisonTableProps) {
  const router = useRouter()
  const [duration, setDuration] = useState<'1' | '2' | '3' | '6'>('1')

  function handleRemove(listingId: string) {
    removeFromComparison(listingId)

    // AI: Update URL
    const remaining = getComparison()
    if (remaining.length === 0) {
      router.push('/compare')
    } else {
      router.push(`/compare?ids=${remaining.join(',')}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* AI: Duration selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Stay Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="1">1 month</option>
          <option value="2">2 months</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
        </select>
      </div>

      {/* AI: Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white border-b p-4 text-left w-48">
                Feature
              </th>
              {listings.map(listing => (
                <th key={listing.listing_id} className="border-b p-4 min-w-[300px]">
                  <ListingHeader listing={listing} onRemove={handleRemove} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* AI: Price */}
            <ComparisonRow
              label="Total Price"
              values={listings.map(l => {
                const key = `short_${duration}month` as keyof typeof l.total_costs
                return `¥${l.total_costs[key].toLocaleString()}`
              })}
            />

            {/* AI: Monthly price */}
            <ComparisonRow
              label="Per Month"
              values={listings.map(l => {
                const key = `short_${duration}month` as keyof typeof l.total_costs
                return `¥${Math.round(l.total_costs[key] / parseInt(duration)).toLocaleString()}/mo`
              })}
            />

            {/* AI: Location */}
            <ComparisonRow
              label="Location"
              values={listings.map(l => `${l.location.ward}, ${l.location.city}`)}
            />

            {/* AI: Size */}
            <ComparisonRow
              label="Size"
              values={listings.map(l => `${l.building_info.floor_area_sqm}m²`)}
            />

            {/* AI: Floor plan */}
            <ComparisonRow
              label="Floor Plan"
              values={listings.map(l => l.building_info.floor_plan)}
            />

            {/* AI: Building age */}
            <ComparisonRow
              label="Building Age"
              values={listings.map(l => `${l.building_info.building_age_years} years`)}
            />

            {/* AI: Station access */}
            <ComparisonRow
              label="Nearest Station"
              values={listings.map(l => {
                const route = l.location.access_routes[0]
                return route
                  ? `${route.station} (${route.walk_minutes} min walk)`
                  : 'N/A'
              })}
            />

            {/* AI: Smart tags */}
            <ComparisonRow
              label="Smart Tags"
              values={listings.map(l => (
                <div className="flex flex-wrap gap-1">
                  {l.smart_tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                    >
                      {tag.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              ))}
            />

            {/* AI: Amenities comparison */}
            {getAmenityCategories().map(category => (
              <ComparisonRow
                key={category.key}
                label={category.label}
                values={listings.map(l => {
                  const items = l.equipment[category.key]
                  return (
                    <ul className="text-sm space-y-1">
                      {items.slice(0, 5).map((item, i) => (
                        <li key={i}>✓ {item}</li>
                      ))}
                      {items.length > 5 && (
                        <li className="text-gray-500">
                          +{items.length - 5} more
                        </li>
                      )}
                    </ul>
                  )
                })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ListingHeader({
  listing,
  onRemove,
}: {
  listing: Listing
  onRemove: (id: string) => void
}) {
  const mainImage = listing.images[0] || '/placeholder.jpg'

  return (
    <div className="text-left">
      {/* AI: Image */}
      <div className="relative h-32 mb-3 rounded overflow-hidden">
        <Image
          src={mainImage}
          alt={listing.title_en}
          fill
          className="object-cover"
        />
      </div>

      {/* AI: Title */}
      <Link
        href={`/stays/${listing.listing_id}`}
        className="font-medium hover:text-primary-500"
      >
        {listing.title_en}
      </Link>

      {/* AI: Remove button */}
      <button
        onClick={() => onRemove(listing.listing_id)}
        className="mt-2 text-sm text-red-600 hover:text-red-700"
      >
        Remove
      </button>
    </div>
  )
}

function ComparisonRow({
  label,
  values,
}: {
  label: string
  values: (React.ReactNode | string)[]
}) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="sticky left-0 bg-white p-4 font-medium">
        {label}
      </td>
      {values.map((value, i) => (
        <td key={i} className="p-4">
          {value}
        </td>
      ))}
    </tr>
  )
}

function getAmenityCategories() {
  return [
    { key: 'electronics' as const, label: 'Electronics' },
    { key: 'furniture' as const, label: 'Furniture' },
    { key: 'kitchen' as const, label: 'Kitchen' },
    { key: 'bath_toilet' as const, label: 'Bath & Toilet' },
    { key: 'building_features' as const, label: 'Building Features' },
  ]
}
```

### 5. Floating Compare Button (Optional)

Create `components/compare/floating-compare-button.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getComparison } from '@/lib/local-storage'

export function FloatingCompareButton() {
  const router = useRouter()
  const [count, setCount] = useState(0)

  useEffect(() => {
    // AI: Listen for localStorage changes
    function handleStorageChange() {
      setCount(getComparison().length)
    }

    handleStorageChange()
    window.addEventListener('storage', handleStorageChange)

    // AI: Poll for changes (since localStorage doesn't emit events in same tab)
    const interval = setInterval(handleStorageChange, 500)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (count === 0) return null

  return (
    <button
      onClick={() => {
        const ids = getComparison()
        router.push(`/compare?ids=${ids.join(',')}`)
      }}
      className="fixed bottom-6 right-6 bg-primary-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-primary-600 transition z-50"
    >
      Compare {count} {count === 1 ? 'listing' : 'listings'} →
    </button>
  )
}
```

Add to root layout:

```typescript
// app/layout.tsx
import { FloatingCompareButton } from '@/components/compare/floating-compare-button'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <NuqsAdapter>
          {children}
          <FloatingCompareButton />
        </NuqsAdapter>
      </body>
    </html>
  )
}
```

## Testing

### Test localStorage Functionality

```typescript
// Test in browser console
import {
  addToComparison,
  getComparison,
  removeFromComparison,
} from '@/lib/local-storage'

// Add some listings
addToComparison('bukken_27107')
addToComparison('bukken_27108')
addToComparison('bukken_27109')

// Check storage
console.log(getComparison())

// Remove one
removeFromComparison('bukken_27108')
console.log(getComparison())
```

## Verification

- [ ] Compare page loads with listings from URL
- [ ] Empty state shows when no listings
- [ ] Comparison table displays all features
- [ ] Duration selector updates all prices
- [ ] Remove button updates URL and localStorage
- [ ] Smart tags display correctly
- [ ] Amenities are categorized properly
- [ ] Images display in headers
- [ ] Links to detail pages work
- [ ] Floating button shows count
- [ ] Floating button navigates to compare page

## Dependencies

- Task 10: Listing detail pages

## Next Task

Task 12: Deploy to AWS Amplify
