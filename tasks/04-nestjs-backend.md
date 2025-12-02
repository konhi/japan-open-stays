# Task 04: NestJS Backend (Simple CRUD)

## Goal

Build a simple NestJS API with CRUD operations for listings. No filtering logic - just serve all listings from DynamoDB.

## Implementation Steps

### 1. Initialize NestJS Project

```bash
cd apps
npx @nestjs/cli new api --package-manager=pnpm --skip-git
cd api
pnpm add @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
pnpm add -D @types/node
```

### 2. Project Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts        # Health check
│   ├── database/
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   ├── listings/
│   │   ├── listings.module.ts
│   │   ├── listings.controller.ts
│   │   ├── listings.service.ts
│   │   └── dto/
│   │       ├── create-listing.dto.ts
│   │       └── listing-response.dto.ts
│   └── locations/
│       ├── locations.module.ts
│       ├── locations.controller.ts
│       └── locations.service.ts
├── Dockerfile
└── package.json
```

### 3. Main Application

Update `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  )

  app.setGlobalPrefix('api')

  const port = process.env.PORT || 3000
  await app.listen(port)

  console.log(`Application is running on: ${await app.getUrl()}`)
}

bootstrap()
```

### 4. App Module

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { DatabaseModule } from './database/database.module'
import { ListingsModule } from './listings/listings.module'
import { LocationsModule } from './locations/locations.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    ListingsModule,
    LocationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Create `src/app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
```

### 5. Database Service

Create `src/database/database.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

@Injectable()
export class DatabaseService {
  private readonly docClient: DynamoDBDocumentClient
  private readonly tableName: string

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    })

    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName =
      process.env.DYNAMODB_TABLE_NAME || 'japan-open-stays-listings'
  }

  async getItem(key: Record<string, any>) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: key,
    })

    const response = await this.docClient.send(command)
    return response.Item
  }

  async putItem(item: Record<string, any>) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    })

    await this.docClient.send(command)
    return item
  }

  async scanAll() {
    const items: any[] = []
    let lastEvaluatedKey: Record<string, any> | undefined

    do {
      const command = new ScanCommand({
        TableName: this.tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      })

      const response = await this.docClient.send(command)

      if (response.Items) {
        items.push(...response.Items)
      }

      lastEvaluatedKey = response.LastEvaluatedKey
    } while (lastEvaluatedKey)

    return items
  }
}
```

Create `src/database/database.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { DatabaseService } from './database.service'

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

### 6. Listings Module

Create `src/listings/listings.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import type { Listing } from '@japan-open-stays/types'

@Injectable()
export class ListingsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<Listing[]> {
    const items = await this.databaseService.scanAll()
    // AI: Filter only active listings
    return items.filter((item) => item.is_active !== false)
  }

  async findOne(id: string): Promise<Listing> {
    const item = await this.databaseService.getItem({ listing_id: id })

    if (!item) {
      throw new NotFoundException(`Listing with ID ${id} not found`)
    }

    return item as Listing
  }

  async create(listing: Partial<Listing>): Promise<Listing> {
    const now = new Date().toISOString()

    const newListing: Listing = {
      ...listing,
      listing_id: listing.listing_id || `bukken_${Date.now()}`,
      scraped_at: now,
      updated_at: now,
      is_active: true,
    } as Listing

    await this.databaseService.putItem(newListing)
    return newListing
  }
}
```

Create `src/listings/listings.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ListingsService } from './listings.service'
import type { Listing } from '@japan-open-stays/types'

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // AI: Return ALL active listings - frontend does filtering
  @Get()
  async findAll() {
    const listings = await this.listingsService.findAll()
    return {
      listings,
      total: listings.length,
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const listing = await this.listingsService.findOne(id)
    return { listing }
  }

  // AI: Used by scraper to create/update listings
  @Post()
  async create(@Body() createListingDto: Partial<Listing>) {
    const listing = await this.listingsService.create(createListingDto)
    return { listing }
  }
}
```

Create `src/listings/listings.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { ListingsController } from './listings.controller'
import { ListingsService } from './listings.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
```

### 7. Locations Module

Create `src/locations/locations.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

@Injectable()
export class LocationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getLocations() {
    const items = await this.databaseService.scanAll()

    // AI: Extract unique prefectures, cities, wards
    const prefectures = new Set<string>()
    const cities = new Set<string>()
    const wards = new Set<string>()

    items.forEach((item) => {
      if (item.location?.prefecture) prefectures.add(item.location.prefecture)
      if (item.location?.city) cities.add(item.location.city)
      if (item.location?.ward) wards.add(item.location.ward)
    })

    return {
      prefectures: Array.from(prefectures).sort(),
      cities: Array.from(cities).sort(),
      wards: Array.from(wards).sort(),
    }
  }
}
```

Create `src/locations/locations.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common'
import { LocationsService } from './locations.service'

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async getLocations() {
    return this.locationsService.getLocations()
  }
}
```

Create `src/locations/locations.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { LocationsController } from './locations.controller'
import { LocationsService } from './locations.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
```

### 8. Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# AI: Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# AI: Copy source code and build
COPY . .
RUN npm run build

# AI: Production image
FROM node:20-alpine

WORKDIR /app

# AI: Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# AI: Copy built application
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

Create `.dockerignore`:

```
node_modules
dist
*.log
.env
```

## Deployment

### Build and Push Docker Image

```bash
# Build image
docker build -t japan-open-stays-api .

# Tag for ECR
docker tag japan-open-stays-api:latest ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/japan-open-stays-api:latest

# Push to ECR
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com
docker push ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/japan-open-stays-api:latest
```

### Update ECS Service

```bash
aws ecs update-service --cluster japan-open-stays-api --service ApiService --force-new-deployment
```

## Testing

```bash
# Local development
pnpm dev

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/listings
curl http://localhost:3000/api/listings/bukken_27107
curl http://localhost:3000/api/locations
```

## Verification

- [ ] Health check endpoint returns 200
- [ ] GET /api/listings returns all listings
- [ ] GET /api/listings/:id returns single listing
- [ ] POST /api/listings creates new listing
- [ ] GET /api/locations returns unique locations
- [ ] Docker image builds successfully
- [ ] Service runs on ECS

## Dependencies

- Task 02: Shared types
- Task 03: CDK infrastructure (DynamoDB table)

## Next Task

Task 05: Deploy NestJS to ECS Fargate



