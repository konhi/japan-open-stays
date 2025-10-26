# Task 02: Shared TypeScript Types

## Goal

Create a shared `@japan-open-stays/types` package with all TypeScript interfaces and types for listings, filters, and API contracts.

## Implementation Steps

### 1. Create Package Structure

```
packages/types/
├── src/
│   ├── listing.ts
│   ├── filters.ts
│   ├── api.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### 2. Package Configuration

Create `packages/types/package.json`:

```json
{
  "name": "@japan-open-stays/types",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Create `packages/types/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### 3. Listing Types (`listing.ts`)

Based on DynamoDB schema from the plan:

```typescript
export interface Listing {
  listing_id: string
  source_url: string
  source_platform: string
  s3_html_key: string

  title_ja: string
  title_en: string
  description_ja: string
  description_en: string

  location: Location
  building_info: BuildingInfo
  pricing_tiers: PricingTiers
  other_fees: OtherFees
  total_costs: TotalCosts
  equipment: Equipment
  key_features: string[]
  smart_tags: SmartTag[]

  contract_info: ContractInfo
  management_company: ManagementCompany
  images: string[]
  floor_plan_image?: string
  map_image?: string

  scraped_at: string
  updated_at: string
  is_active: boolean
  ai_processing_version: string
}

export interface Location {
  prefecture: string
  city: string
  ward: string
  address_full: string
  lat: number
  lng: number
  access_routes: AccessRoute[]
}

export interface AccessRoute {
  line: string
  station: string
  walk_minutes: number
  bus_name?: string
  bus_minutes?: number
  bus_walk_minutes?: number
}

export interface BuildingInfo {
  built_date: string
  building_age_years: number
  structure: string
  floors_total: number
  floor_plan: string
  floor_area_sqm: number
  max_capacity: number
  bed_type: string
  parking_available: boolean
  min_contract_days: number
}

export interface PricingTier {
  duration_months: string
  rent_per_day: number
  rent_per_month: number
  utilities_per_day: number
  utilities_per_month: number
  cleaning_fee: number
}

export interface PricingTiers {
  short: PricingTier
  middle: PricingTier
  long: PricingTier
}

export interface OtherFees {
  bedding_fee: number
  re_contract_guarantee_fee: number
  additional_person_utilities_per_day: number
  dishware_set_option_fee: number
}

export interface TotalCosts {
  short_1month: number
  short_2months: number
  middle_3months: number
  middle_6months: number
  long_12months: number
}

export interface Equipment {
  electronics: string[]
  furniture: string[]
  kitchen: string[]
  bath_toilet: string[]
  supplies: string[]
  building_features: string[]
  room_features: string[]
}

export type SmartTag =
  | 'near_transit'
  | 'quiet_neighborhood'
  | 'foreigner_friendly'
  | 'natural_light'
  | 'modern_interior'
  | 'wfh_suitable'
  | 'pet_indicators'

export interface ContractInfo {
  contract_type: string
  guarantor_required: boolean
  payment_methods: string[]
  accepted_cards: string[]
  required_documents: string[]
}

export interface ManagementCompany {
  name: string
  address: string
  phone: string
  hours: string
  days: string
}
```

### 4. Filter Types (`filters.ts`)

```typescript
import { SmartTag } from './listing'

export type Duration = '1' | '2' | '3' | '6' | '12'
export type BuildingAge = 'new' | 'less_5yr' | 'less_10yr' | 'any'

export interface Filters {
  // Price
  price_min?: number
  price_max?: number
  duration: Duration

  // Location
  prefecture?: string
  city?: string
  ward?: string

  // Dates
  move_in_date?: string

  // Size & Building
  size_min?: number
  size_max?: number
  building_age?: BuildingAge
  floor_min?: number

  // Amenities
  amenities?: string[]

  // Smart filters
  smart?: SmartTag[]
}

export interface LocationOption {
  value: string
  label: string
}
```

### 5. API Types (`api.ts`)

```typescript
import { Listing } from './listing'

export interface ListingsResponse {
  listings: Listing[]
  total: number
}

export interface ListingResponse {
  listing: Listing
}

export interface CreateListingRequest {
  listing: Omit<Listing, 'listing_id' | 'scraped_at' | 'updated_at'>
}

export interface LocationsResponse {
  prefectures: string[]
  cities: string[]
  wards: string[]
}

export interface ApiError {
  statusCode: number
  message: string
  error: string
}
```

### 6. Index Export (`index.ts`)

```typescript
export * from './listing'
export * from './filters'
export * from './api'
```

## Verification

- [ ] Package builds without errors
- [ ] All types are properly exported
- [ ] Types match the DynamoDB schema from plan
- [ ] Smart tags enum matches AI processing tags

## Dependencies

- Task 01: Monorepo setup

## Next Task

Task 03: Build AWS CDK infrastructure stacks
