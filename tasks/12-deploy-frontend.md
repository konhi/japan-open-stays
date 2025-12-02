# Task 12: Deploy to AWS Amplify

## Goal

Deploy the Next.js frontend to AWS Amplify with proper environment configuration and custom domain (optional).

## Implementation Steps

### 1. Prepare for Deployment

Update `package.json` in apps/web:

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "deploy": "aws amplify create-app"
  }
}
```

### 2. Create Amplify App via CDK

The Amplify stack from Task 03 should already be configured. Verify environment variables:

```typescript
// infrastructure/lib/frontend-stack.ts
environmentVariables: {
  NEXT_PUBLIC_API_URL: props.apiUrl,
  NEXT_PUBLIC_MAPBOX_TOKEN: cdk.SecretValue.secretsManager('mapbox-token').toString(),
}
```

### 3. Add Mapbox Token to Secrets Manager

```bash
aws secretsmanager create-secret \
  --name mapbox-token \
  --secret-string "pk.your_mapbox_token_here" \
  --region ap-northeast-1
```

### 4. Deploy Infrastructure

```bash
cd infrastructure
cdk deploy JapanOpenStaysFrontend
```

### 5. Connect GitHub Repository

Via AWS Console:

1. Go to AWS Amplify
2. Select your app
3. Connect GitHub repository
4. Select branch: `main`
5. Configure build settings (should auto-detect Next.js)

### 6. Configure Build Settings

Amplify should auto-detect, but verify `amplify.yml`:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - cd apps/web
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
      buildPath: /apps/web
```

### 7. Environment Variables

Add in Amplify Console → Environment variables:

- `NEXT_PUBLIC_API_URL`: Your ALB URL from API stack
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Reference from Secrets Manager

### 8. Deploy

Push to main branch or trigger manual deploy from Amplify console.

### 9. Custom Domain (Optional)

1. Go to Amplify → Domain management
2. Add domain
3. Follow DNS configuration steps
4. Wait for SSL certificate provisioning

### 10. Monitoring

Set up CloudWatch alarms for:

- Build failures
- High error rates
- Response time

## Verification

- [ ] Build completes successfully
- [ ] App is accessible via Amplify URL
- [ ] Environment variables are set
- [ ] API calls work correctly
- [ ] Map renders (Mapbox token valid)
- [ ] Filters update URL
- [ ] Detail pages load
- [ ] Custom domain works (if configured)

## Dependencies

- All previous tasks

## Next Steps

- Monitor performance
- Gather user feedback
- Iterate on features



