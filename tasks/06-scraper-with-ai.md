# Task 06: Scraper with AI Integration

## Goal

Build a Crawlee-based scraper for weekly-mansion.com that extracts listings, processes them with Claude AI, and posts to the NestJS API.

## Implementation Steps

### 1. Initialize Scraper Project

```bash
cd apps
npx crawlee create scraper
cd scraper
pnpm add @anthropic-ai/sdk
pnpm add -D @types/node
```

### 2. Project Structure

```
apps/scraper/
├── src/
│   ├── main.ts
│   ├── config.ts
│   ├── parsers/
│   │   └── weekly-mansion.ts
│   ├── ai/
│   │   ├── claude-client.ts
│   │   ├── pricing-extractor.ts
│   │   ├── translation.ts
│   │   └── smart-tags.ts
│   ├── storage/
│   │   ├── api-client.ts
│   │   └── s3-uploader.ts
│   └── utils/
│       └── tokyo-area-codes.ts
└── apify.json
```

### 3. Configuration

Create `src/config.ts`:

```typescript
export const config = {
  weeklyMansion: {
    baseUrl: 'https://www.weekly-mansion.com',
    searchUrl: 'https://www.weekly-mansion.com/tokyo/search/list_add.html',
    detailUrlTemplate: 'https://www.weekly-mansion.com/detail/?bukken_no=',
    rateLimit: 2, // AI: 2 requests per second (respectful)
  },

  api: {
    baseUrl: process.env.API_URL || 'http://localhost:3000/api',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-5-sonnet-20241022',
  },

  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    s3Bucket: process.env.S3_BUCKET_NAME!,
  },
}
```

### 4. Tokyo Area Codes

Create `src/utils/tokyo-area-codes.ts`:

```typescript
// AI: All Tokyo area codes for comprehensive scraping
export const TOKYO_AREA_CODES = [
  '13207',
  '13228',
  '13121',
  '13118',
  '13119',
  '13225',
  '13123',
  '13205',
  '13111',
  '13122',
  '13117',
  '13221',
  '13215',
  '13108',
  '13210',
  '13214',
  '13211',
  '13219',
  '13109',
  '13113',
  '13104',
  '13115',
  '13107',
  '13112',
  '13106',
  '13202',
  '13224',
  '13102',
  '13208',
  '13101',
  '13116',
  '13114',
  '13229',
  '13120',
  '13201',
  '13227',
  '13222',
  '13213',
  '13220',
  '13212',
  '13218',
  '13206',
  '13105',
  '13209',
  '13204',
  '13103',
  '13203',
  '13110',
]

// AI: Mapping of area codes to ward names for reference
export const AREA_CODE_NAMES: Record<string, string> = {
  '13101': '千代田区',
  '13102': '中央区',
  '13103': '港区',
  '13104': '新宿区',
  '13105': '文京区',
  '13106': '台東区',
  '13107': '墨田区',
  '13108': '江東区',
  '13109': '品川区',
  // ... add all mappings
}
```

### 5. Weekly Mansion Parser

Create `src/parsers/weekly-mansion.ts`:

```typescript
import { CheerioCrawler, Dataset } from 'crawlee'
import { config } from '../config'
import { TOKYO_AREA_CODES } from '../utils/tokyo-area-codes'

export interface RawListing {
  bukken_no: string
  html: string
  url: string
  scraped_at: string
}

export async function scrapeAllListings() {
  const listingIds: string[] = []

  // AI: Step 1 - Get all listing IDs from search page
  console.log('🔍 Fetching all Tokyo listings...')

  const listCrawler = new CheerioCrawler({
    maxRequestsPerMinute: 120,
    async requestHandler({ $, request }) {
      // AI: Extract all bukken_no from listing cards
      $('.bukken_card').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const match = href?.match(/bukken_no=(\d+)/)
        if (match) {
          listingIds.push(match[1])
        }
      })
    },
  })

  // AI: Create form data with all Tokyo area codes
  const formData = new URLSearchParams()
  TOKYO_AREA_CODES.forEach((code) => {
    formData.append('jyuusyo_cd_list[]', code)
  })
  formData.append('disp_count', '10000') // AI: Get all results

  await listCrawler.run([
    {
      url: config.weeklyMansion.searchUrl,
      method: 'POST',
      payload: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  ])

  console.log(`✅ Found ${listingIds.length} listings`)

  // AI: Step 2 - Scrape each detail page
  const detailCrawler = new CheerioCrawler({
    maxRequestsPerMinute: 120, // AI: 2 per second
    async requestHandler({ $, request }) {
      const bukken_no = request.userData.bukken_no

      const rawListing: RawListing = {
        bukken_no,
        html: $.html(),
        url: request.url,
        scraped_at: new Date().toISOString(),
      }

      await Dataset.pushData(rawListing)
    },
  })

  // AI: Create detail page URLs
  const detailUrls = listingIds.map((id) => ({
    url: `${config.weeklyMansion.detailUrlTemplate}${id}`,
    userData: { bukken_no: id },
  }))

  console.log(`🕷️  Scraping ${detailUrls.length} detail pages...`)
  await detailCrawler.run(detailUrls)

  return listingIds.length
}

export function parseListingHtml(
  html: string
): Partial<import('@japan-open-stays/types').Listing> {
  const $ = require('cheerio').load(html)

  // AI: Extract all structured data from HTML
  const listing: any = {
    title_ja: $('.bukken_name').text().trim(),

    // AI: Location data
    location: {
      address_full: $('.address').text().trim(),
      prefecture: '東京都',
      access_routes: [],
    },

    // AI: Building info
    building_info: {
      built_date: $('.built_date').text().trim(),
      structure: $('.structure').text().trim(),
      floors_total: parseInt($('.floors').text()) || 0,
      floor_plan: $('.floor_plan').text().trim(),
      floor_area_sqm: parseFloat($('.area').text()) || 0,
      max_capacity: parseInt($('.capacity').text()) || 1,
      parking_available: $('.parking').text().includes('有'),
      min_contract_days: 30,
    },

    // AI: Extract amenities
    equipment: {
      electronics: [],
      furniture: [],
      kitchen: [],
      bath_toilet: [],
      supplies: [],
      building_features: [],
      room_features: [],
    },

    key_features: [],

    // AI: Images
    images: [],

    // AI: Description (for AI processing)
    description_ja: $('.recommend_comment').text().trim(),
  }

  // AI: Extract access routes
  $('.access_item').each((_, el) => {
    const route: any = {
      line: $(el).find('.line').text().trim(),
      station: $(el).find('.station').text().trim(),
      walk_minutes: parseInt($(el).find('.walk_time').text()) || 0,
    }

    const busInfo = $(el).find('.bus_info').text()
    if (busInfo) {
      route.bus_name = $(el).find('.bus_name').text().trim()
      route.bus_minutes = parseInt($(el).find('.bus_time').text()) || 0
      route.bus_walk_minutes = parseInt($(el).find('.bus_walk').text()) || 0
    }

    listing.location.access_routes.push(route)
  })

  // AI: Extract amenities by category
  $('.equipment_item').each((_, el) => {
    const item = $(el).text().trim()
    const category = categorizeAmenity(item)
    listing.equipment[category].push(item)
  })

  // AI: Extract images
  $('.photo_item img').each((_, el) => {
    const src = $(el).attr('src')
    if (src) listing.images.push(src)
  })

  return listing
}

function categorizeAmenity(item: string): string {
  if (/エアコン|テレビ|冷蔵庫|洗濯機|電子レンジ/.test(item))
    return 'electronics'
  if (/ベッド|テーブル|イス|ソファ|カーテン/.test(item)) return 'furniture'
  if (/キッチン|ガスコンロ|IH|食器/.test(item)) return 'kitchen'
  if (/バス|シャワー|トイレ|洗面/.test(item)) return 'bath_toilet'
  if (/タオル|ハンガー|ゴミ箱/.test(item)) return 'supplies'
  if (/オートロック|エレベーター|駐輪場/.test(item)) return 'building_features'
  return 'room_features'
}
```

### 6. Claude AI Client

Create `src/ai/claude-client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'

export const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
})

export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: config.anthropic.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text
  }

  throw new Error('Unexpected response type from Claude')
}
```

### 7. Translation Service

Create `src/ai/translation.ts`:

```typescript
import { callClaude } from './claude-client'

export async function translateToEnglish(
  title: string,
  description: string
): Promise<{
  title_en: string
  description_en: string
}> {
  const prompt = `Translate the following Japanese rental property listing to natural English:

Title: ${title}

Description: ${description}

Return a JSON object with "title_en" and "description_en" fields. Keep it concise and natural.`

  const systemPrompt =
    'You are a translator specializing in Japanese real estate listings. Translate naturally and preserve important details like transportation access, amenities, and building features.'

  const response = await callClaude(prompt, systemPrompt)

  try {
    const parsed = JSON.parse(response)
    return {
      title_en: parsed.title_en || title,
      description_en: parsed.description_en || description,
    }
  } catch (error) {
    console.error('Failed to parse translation response:', error)
    return {
      title_en: title,
      description_en: description,
    }
  }
}
```

### 8. Smart Tags Generator

Create `src/ai/smart-tags.ts`:

```typescript
import { callClaude } from './claude-client'
import type { SmartTag } from '@japan-open-stays/types'

export async function generateSmartTags(
  description: string,
  walkMinutes: number,
  buildingAge: number,
  amenities: string[]
): Promise<SmartTag[]> {
  const tags: SmartTag[] = []

  // AI: Rule-based tags (fast)
  if (walkMinutes <= 10) tags.push('near_transit')
  if (buildingAge < 5) tags.push('modern_interior')

  // AI: AI-enhanced tags from description
  const prompt = `Analyze this Japanese rental property listing and identify applicable tags:

Description: ${description}

Amenities: ${amenities.join(', ')}

Which of these tags apply? Respond with a JSON array of applicable tags:
- quiet_neighborhood: mentions 閑静, 住宅街, or quiet area characteristics
- foreigner_friendly: mentions 外国人OK, English support, or international-friendly
- natural_light: mentions 南向き, バルコニー, 採光, or good natural light
- wfh_suitable: mentions デスク, 作業スペース, 光回線, or work-from-home features
- pet_indicators: mentions ペット相談, ペット可, or pet-related keywords

Return only the tag names as a JSON array.`

  const systemPrompt =
    'You are an expert at analyzing Japanese rental property descriptions. Be conservative - only return tags that clearly apply based on the evidence.'

  try {
    const response = await callClaude(prompt, systemPrompt)
    const aiTags = JSON.parse(response) as SmartTag[]
    tags.push(...aiTags)
  } catch (error) {
    console.error('Failed to generate AI tags:', error)
  }

  return [...new Set(tags)] // AI: Remove duplicates
}
```

### 9. Pricing Extractor

Create `src/ai/pricing-extractor.ts`:

```typescript
import { callClaude } from './claude-client'
import type {
  PricingTiers,
  TotalCosts,
  OtherFees,
} from '@japan-open-stays/types'

export async function extractPricingData(html: string): Promise<{
  pricing_tiers: PricingTiers
  other_fees: OtherFees
  total_costs: TotalCosts
}> {
  const prompt = `Extract all pricing information from this Japanese rental property HTML:

${html}

Calculate total costs for 1, 2, 3, 6, and 12 month stays including:
- Base rent (家賃 or 賃料)
- Utilities (光熱費)
- Cleaning fee (清掃費)
- Bedding fee (寝具代)
- Management fee (管理費)
- Any other fees

Return a JSON object with this structure:
{
  "pricing_tiers": {
    "short": { "duration_months": "1-3", "rent_per_day": X, "rent_per_month": Y, ... },
    "middle": { ... },
    "long": { ... }
  },
  "other_fees": {
    "bedding_fee": X,
    "re_contract_guarantee_fee": Y,
    ...
  },
  "total_costs": {
    "short_1month": X,
    "short_2months": Y,
    ...
  }
}`

  const systemPrompt =
    'You are an expert at extracting and calculating Japanese rental property costs. Be thorough and accurate with all fees.'

  try {
    const response = await callClaude(prompt, systemPrompt)
    return JSON.parse(response)
  } catch (error) {
    console.error('Failed to extract pricing:', error)
    throw error
  }
}
```

### 10. API Client

Create `src/storage/api-client.ts`:

```typescript
import type { Listing } from '@japan-open-stays/types'
import { config } from '../config'

export async function postListing(listing: Partial<Listing>): Promise<void> {
  const response = await fetch(`${config.api.baseUrl}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(listing),
  })

  if (!response.ok) {
    throw new Error(`Failed to post listing: ${response.statusText}`)
  }
}

export async function postListingsBatch(
  listings: Partial<Listing>[]
): Promise<void> {
  // AI: Post in batches of 100
  const BATCH_SIZE = 100

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE)

    await Promise.all(batch.map((listing) => postListing(listing)))

    console.log(
      `✅ Posted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} listings)`
    )
  }
}
```

### 11. Main Scraper

Create `src/main.ts`:

```typescript
import { Dataset } from 'crawlee'
import {
  scrapeAllListings,
  parseListingHtml,
  type RawListing,
} from './parsers/weekly-mansion'
import { translateToEnglish } from './ai/translation'
import { generateSmartTags } from './ai/smart-tags'
import { extractPricingData } from './ai/pricing-extractor'
import { postListingsBatch } from './storage/api-client'
import type { Listing } from '@japan-open-stays/types'

async function main() {
  console.log('🚀 Starting Japan Open Stays Scraper...')

  // AI: Step 1 - Scrape all listings
  const totalListings = await scrapeAllListings()
  console.log(`📊 Scraped ${totalListings} listings`)

  // AI: Step 2 - Process with AI
  const dataset = await Dataset.open()
  const rawListings = (await dataset.getData()) as { items: RawListing[] }

  const processedListings: Partial<Listing>[] = []

  for (const raw of rawListings.items) {
    try {
      console.log(`🤖 Processing ${raw.bukken_no}...`)

      // AI: Parse HTML
      const parsed = parseListingHtml(raw.html)

      // AI: AI Processing
      const [translation, pricing, smartTags] = await Promise.all([
        translateToEnglish(parsed.title_ja!, parsed.description_ja!),
        extractPricingData(raw.html),
        generateSmartTags(
          parsed.description_ja!,
          parsed.location?.access_routes[0]?.walk_minutes || 99,
          parsed.building_info?.building_age_years || 99,
          Object.values(parsed.equipment || {}).flat()
        ),
      ])

      const listing: Partial<Listing> = {
        ...parsed,
        listing_id: `bukken_${raw.bukken_no}`,
        source_url: raw.url,
        source_platform: 'weekly-mansion',
        ...translation,
        ...pricing,
        smart_tags: smartTags,
        is_active: true,
        ai_processing_version: '1.0',
      }

      processedListings.push(listing)

      // AI: Batch upload every 100 listings
      if (processedListings.length >= 100) {
        await postListingsBatch(processedListings)
        processedListings.length = 0
      }
    } catch (error) {
      console.error(`❌ Failed to process ${raw.bukken_no}:`, error)
    }
  }

  // AI: Upload remaining listings
  if (processedListings.length > 0) {
    await postListingsBatch(processedListings)
  }

  console.log('✅ Scraper completed!')
}

main()
```

### 12. Apify Configuration

Create `apify.json`:

```json
{
  "name": "japan-open-stays-scraper",
  "version": "1.0",
  "buildTag": "latest",
  "env": {
    "API_URL": "@API_URL",
    "ANTHROPIC_API_KEY": "@ANTHROPIC_API_KEY",
    "AWS_REGION": "ap-northeast-1",
    "S3_BUCKET_NAME": "@S3_BUCKET_NAME"
  },
  "schedule": "0 2 * * *"
}
```

## Testing

### Test with Small Sample

Create `src/test.ts`:

```typescript
import { scrapeAllListings } from './parsers/weekly-mansion'

// AI: Override to scrape only 10 listings for testing
process.env.TEST_MODE = 'true'

scrapeAllListings()
```

### Run Locally

```bash
# Test scraper
pnpm start

# Test with sample
pnpm exec ts-node src/test.ts
```

## Verification

- [ ] Scraper retrieves all Tokyo listing IDs
- [ ] Detail pages are scraped correctly
- [ ] HTML parsing extracts all fields
- [ ] Claude translations are accurate
- [ ] Smart tags are generated correctly
- [ ] Pricing calculations are accurate
- [ ] Listings are posted to API successfully
- [ ] Rate limiting is respected (2 req/sec)

## Dependencies

- Task 04: NestJS API (for posting listings)
- Task 05: Deployed API endpoint

## Next Task

Task 07: Deploy scraper to Apify and run full scrape



