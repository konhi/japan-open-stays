# Task 07: Deploy Scraper to Apify

## Goal

Deploy the scraper to Apify platform and run the first full scrape of all Tokyo listings.

## Prerequisites

- Apify account created
- Apify CLI installed
- API endpoint deployed and accessible
- Anthropic API key ready
- AWS S3 bucket ready (if storing HTML)

## Implementation Steps

### 1. Install Apify CLI

```bash
npm install -g apify-cli
apify login
```

### 2. Initialize Apify Project

```bash
cd apps/scraper
apify init
```

### 3. Configure Apify Secrets

```bash
# AI: Add secrets via CLI
apify secrets add API_URL "https://your-alb-url.amazonaws.com/api"
apify secrets add ANTHROPIC_API_KEY "sk-ant-..."
apify secrets add S3_BUCKET_NAME "your-bucket-name"
```

Or via Apify Console:

- Go to Settings → Secrets
- Add each secret key-value pair

### 4. Update package.json

Update `apps/scraper/package.json`:

```json
{
  "name": "japan-open-stays-scraper",
  "version": "1.0.0",
  "scripts": {
    "start": "node dist/main.js",
    "build": "tsc",
    "deploy": "apify push"
  },
  "dependencies": {
    "crawlee": "^3.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@aws-sdk/client-s3": "^3.0.0",
    "cheerio": "^1.0.0"
  }
}
```

### 5. Create Apify Input Schema

Create `.actor/input_schema.json`:

```json
{
  "title": "Japan Open Stays Scraper Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "testMode": {
      "title": "Test Mode",
      "type": "boolean",
      "description": "If true, only scrape 10 listings for testing",
      "default": false
    },
    "maxListings": {
      "title": "Max Listings",
      "type": "integer",
      "description": "Maximum number of listings to scrape (0 = unlimited)",
      "default": 0
    },
    "skipAi": {
      "title": "Skip AI Processing",
      "type": "boolean",
      "description": "Skip AI translation and tag generation (for debugging)",
      "default": false
    }
  }
}
```

### 6. Create Dockerfile for Apify

Create `.actor/Dockerfile`:

```dockerfile
FROM apify/actor-node:20

COPY package*.json ./
RUN npm --quiet set progress=false \
  && npm install --only=prod --no-optional

COPY . ./

RUN npm run build
```

### 7. Update Main Script for Input

Update `src/main.ts` to handle Apify input:

```typescript
import { Actor } from 'apify'

async function main() {
  await Actor.init()

  const input = (await Actor.getInput()) || {}
  const { testMode = false, maxListings = 0, skipAi = false } = input

  console.log('🚀 Starting Japan Open Stays Scraper...')
  console.log(`Test Mode: ${testMode}`)
  console.log(`Max Listings: ${maxListings || 'unlimited'}`)

  // ... existing scraper logic with input parameters

  await Actor.exit()
}

main()
```

### 8. Deploy to Apify

```bash
cd apps/scraper

# AI: Build and push to Apify
apify push

# AI: View actor in Apify Console
apify info
```

### 9. Configure Schedule

Via Apify Console:

1. Go to your actor → Schedules
2. Create new schedule:
   - **Name:** Daily Tokyo Scrape
   - **Cron:** `0 2 * * *` (2 AM JST daily)
   - **Input:**
     ```json
     {
       "testMode": false,
       "maxListings": 0,
       "skipAi": false
     }
     ```
3. Enable schedule

Or via CLI:

Create `schedule.json`:

```json
{
  "name": "Daily Tokyo Scrape",
  "cronExpression": "0 2 * * *",
  "timezone": "Asia/Tokyo",
  "actions": [
    {
      "actorId": "YOUR_ACTOR_ID",
      "input": {
        "testMode": false,
        "maxListings": 0
      }
    }
  ]
}
```

```bash
apify schedules create schedule.json
```

### 10. Run Test Scrape

```bash
# AI: Run with test mode (only 10 listings)
apify call --input '{"testMode": true, "maxListings": 10}'

# AI: Monitor logs
apify logs
```

### 11. Run Full Scrape

```bash
# AI: Run full scrape of all Tokyo listings
apify call --input '{"testMode": false}'
```

### 12. Monitoring Setup

Create monitoring script `scripts/check-scraper-health.sh`:

```bash
#!/bin/bash

# AI: Get latest run status from Apify
ACTOR_ID="YOUR_ACTOR_ID"
APIFY_TOKEN="YOUR_TOKEN"

LATEST_RUN=$(curl -s "https://api.apify.com/v2/acts/${ACTOR_ID}/runs/last?token=${APIFY_TOKEN}")

STATUS=$(echo $LATEST_RUN | jq -r '.data.status')
FINISHED_AT=$(echo $LATEST_RUN | jq -r '.data.finishedAt')
STATS=$(echo $LATEST_RUN | jq -r '.data.stats')

echo "Latest Scraper Run:"
echo "  Status: $STATUS"
echo "  Finished: $FINISHED_AT"
echo "  Stats: $STATS"

if [ "$STATUS" != "SUCCEEDED" ]; then
  echo "⚠️  Warning: Latest run did not succeed!"
  exit 1
fi
```

### 13. Create Notification Webhook (Optional)

Configure Apify webhook for run completion:

- Go to Actor → Webhooks
- Add webhook URL (e.g., Slack, Discord, email service)
- Event type: `ACTOR.RUN.SUCCEEDED` or `ACTOR.RUN.FAILED`

## Performance Expectations

### Test Run (10 listings)

- **Duration:** ~2-3 minutes
- **AI Calls:** 30 (10 listings × 3 calls each)
- **API Requests:** 10 POST requests

### Full Scrape (~11,000 listings)

- **Duration:** ~2-3 hours
- **Scraping:** ~1.5 hours (11k pages @ 2/sec)
- **AI Processing:** ~1 hour (33k Claude API calls)
- **API Uploads:** ~10 minutes (110 batches of 100)
- **Total Cost:** ~$100-150 (Anthropic API + Apify compute)

## Cost Optimization

### Reduce AI Calls

Only call AI for new/changed listings:

```typescript
// AI: Check if listing exists and hasn't changed
const existingListing = await fetch(`${API_URL}/listings/${bukken_no}`)

if (existingListing.ok) {
  const existing = await existingListing.json()
  // AI: Skip if HTML hash matches
  if (existing.html_hash === currentHash) {
    console.log(`⏭️  Skipping ${bukken_no} (no changes)`)
    return
  }
}
```

### Batch AI Calls

Use Claude's batch API for non-urgent processing:

```typescript
// AI: Collect all prompts first
const prompts = listings.map((l) => ({
  id: l.bukken_no,
  prompt: generatePrompt(l),
}))

// AI: Submit batch job
const batchJob = await anthropic.batches.create({ prompts })

// AI: Poll for completion (cheaper but slower)
```

## Troubleshooting

### Scraper Times Out

Increase Apify actor timeout:

```json
{
  "actorSpecification": 1,
  "name": "japan-open-stays-scraper",
  "version": "1.0",
  "buildTag": "latest",
  "defaultRunOptions": {
    "timeout": 14400,
    "memory": 4096
  }
}
```

### Memory Issues

Process in smaller batches:

```typescript
// AI: Process 1000 at a time
for (let i = 0; i < listingIds.length; i += 1000) {
  const batch = listingIds.slice(i, i + 1000)
  await processBatch(batch)

  // AI: Clear memory
  await Dataset.clear()
}
```

### Rate Limiting

Adjust crawler config:

```typescript
const crawler = new CheerioCrawler({
  maxConcurrency: 1,
  maxRequestsPerMinute: 60, // AI: Reduce to 1/sec
})
```

## Verification

- [ ] Actor deploys successfully to Apify
- [ ] Test run completes with 10 listings
- [ ] Full scrape runs without errors
- [ ] All listings appear in API
- [ ] Smart tags are generated correctly
- [ ] Translations are accurate
- [ ] Schedule is configured correctly
- [ ] Monitoring/alerts are set up

## Dependencies

- Task 05: Deployed API
- Task 06: Scraper implementation

## Next Task

Task 08: Setup Next.js 16 frontend with PPR and React Compiler



