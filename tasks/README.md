# Japan Open Stays - Task Breakdown

This directory contains the complete task breakdown for implementing the Japan Open Stays application.

## Task Overview

1. **[Monorepo Setup](./01-monorepo-setup.md)** - Set up pnpm workspaces, ESLint 9, Prettier, Knip, Husky
2. **[Shared Types](./02-shared-types.md)** - Define TypeScript types for listings, filters, API contracts
3. **[CDK Infrastructure](./03-cdk-infrastructure.md)** - Build AWS CDK stacks for DynamoDB, S3, ECS, Amplify
4. **[NestJS Backend](./04-nestjs-backend.md)** - Implement simple CRUD API with DynamoDB
5. **[Deploy API](./05-deploy-api.md)** - Deploy NestJS to ECS Fargate with Docker
6. **[Scraper with AI](./06-scraper-with-ai.md)** - Build Crawlee scraper with Claude AI integration
7. **[Deploy Scraper](./07-deploy-scraper.md)** - Deploy scraper to Apify with daily scheduling
8. **[Next.js Setup](./08-nextjs-setup.md)** - Set up Next.js 16 with PPR, React Compiler, Turbopack
9. **[Map and Filters](./09-map-and-filters.md)** - Build map view with client-side filtering using nuqs
10. **[Listing Details](./10-listing-details.md)** - Create detail pages with galleries and price breakdowns
11. **[Compare Feature](./11-compare-feature.md)** - Implement side-by-side listing comparison
12. **[Deploy Frontend](./12-deploy-frontend.md)** - Deploy to AWS Amplify

## Execution Order

Tasks should be completed in sequential order as each task depends on previous ones.

## Key Features by Task

### Infrastructure (Tasks 1-3, 5, 7, 12)

- Monorepo with pnpm workspaces
- AWS CDK for infrastructure as code
- ECS Fargate for API
- Amplify for frontend
- Apify for scraping

### Backend (Tasks 4-5)

- NestJS CRUD API
- DynamoDB integration
- Simple endpoints (no filtering)
- Docker deployment

### Scraping (Tasks 6-7)

- Crawlee for web scraping
- Claude AI for translation and tags
- Batch processing
- Daily scheduling

### Frontend (Tasks 8-12)

- Next.js 16 with App Router
- Client-side filtering with nuqs
- Mapbox GL JS integration
- Server Components + Client Components
- PPR and React Compiler

## Development Timeline Estimate

- Tasks 1-3: 1-2 days (setup and infrastructure)
- Tasks 4-5: 1 day (backend API)
- Tasks 6-7: 2-3 days (scraper with AI)
- Tasks 8-9: 2-3 days (frontend core)
- Tasks 10-11: 1-2 days (detail pages and compare)
- Task 12: 0.5 days (deployment)

**Total: ~8-12 days** (for experienced developer working full-time)

## Tech Stack Summary

**Frontend:**

- Next.js 16 (App Router, PPR, React Compiler, Turbopack)
- nuqs (URL state management)
- Tailwind CSS
- Mapbox GL JS

**Backend:**

- NestJS + TypeScript
- DynamoDB (AWS SDK v3)
- Docker + ECS Fargate

**Scraping:**

- Crawlee (Cheerio crawler)
- Anthropic Claude API
- Apify platform

**Infrastructure:**

- AWS CDK (TypeScript)
- AWS Amplify Gen 2
- CloudWatch

**Code Quality:**

- ESLint 9 (flat config)
- Prettier
- Knip
- Husky pre-commit hooks
