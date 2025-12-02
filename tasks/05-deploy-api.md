# Task 05: Deploy NestJS to ECS Fargate

## Goal

Deploy the NestJS API to AWS ECS Fargate using the infrastructure created in Task 03.

## Prerequisites

- AWS CLI configured with correct credentials
- Docker installed locally
- ECS cluster created (from Task 03)
- ECR repository created (from Task 03)
- DynamoDB table exists (from Task 03)

## Implementation Steps

### 1. Get Infrastructure Outputs

```bash
cd infrastructure

# AI: Get the ECR repository URI
aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' \
  --output text

# AI: Save this as ECR_REPO_URI for next steps
export ECR_REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' \
  --output text)

# AI: Get the ALB URL
aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 2. Build Docker Image

```bash
cd ../apps/api

# AI: Build the Docker image
docker build -t japan-open-stays-api:latest .

# AI: Tag for ECR
docker tag japan-open-stays-api:latest $ECR_REPO_URI:latest
docker tag japan-open-stays-api:latest $ECR_REPO_URI:$(git rev-parse --short HEAD)
```

### 3. Push to ECR

```bash
# AI: Login to ECR
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $ECR_REPO_URI

# AI: Push both tags
docker push $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:$(git rev-parse --short HEAD)
```

### 4. Update ECS Service

```bash
# AI: Force new deployment to pick up latest image
aws ecs update-service \
  --cluster JapanOpenStaysApiCluster \
  --service ApiService \
  --force-new-deployment \
  --region ap-northeast-1

# AI: Wait for deployment to complete
aws ecs wait services-stable \
  --cluster JapanOpenStaysApiCluster \
  --services ApiService \
  --region ap-northeast-1
```

### 5. Verify Deployment

```bash
# AI: Get the ALB DNS name
export API_URL=$(aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# AI: Test health check
curl $API_URL/api/health

# AI: Test listings endpoint (should return empty array initially)
curl $API_URL/api/listings

# AI: Test locations endpoint
curl $API_URL/api/locations
```

### 6. Check Logs

```bash
# AI: View CloudWatch logs
aws logs tail /ecs/api --follow --region ap-northeast-1
```

### 7. Create Deployment Script

Create `apps/api/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Japan Open Stays API to ECS..."

# AI: Get ECR repository URI
ECR_REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`EcrRepositoryUri`].OutputValue' \
  --output text)

if [ -z "$ECR_REPO_URI" ]; then
  echo "❌ Error: Could not get ECR repository URI"
  exit 1
fi

echo "📦 Building Docker image..."
docker build -t japan-open-stays-api:latest .

echo "🏷️  Tagging image..."
GIT_SHA=$(git rev-parse --short HEAD)
docker tag japan-open-stays-api:latest $ECR_REPO_URI:latest
docker tag japan-open-stays-api:latest $ECR_REPO_URI:$GIT_SHA

echo "🔑 Logging in to ECR..."
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin $ECR_REPO_URI

echo "⬆️  Pushing to ECR..."
docker push $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:$GIT_SHA

echo "♻️  Updating ECS service..."
aws ecs update-service \
  --cluster JapanOpenStaysApiCluster \
  --service ApiService \
  --force-new-deployment \
  --region ap-northeast-1 \
  --no-cli-pager

echo "⏳ Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster JapanOpenStaysApiCluster \
  --services ApiService \
  --region ap-northeast-1

API_URL=$(aws cloudformation describe-stacks \
  --stack-name JapanOpenStaysApi \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

echo "✅ Deployment complete!"
echo "🌐 API URL: $API_URL/api"
echo "💚 Health: $API_URL/api/health"

echo ""
echo "🧪 Testing health endpoint..."
curl -s $API_URL/api/health | jq .
```

Make it executable:

```bash
chmod +x deploy.sh
```

### 8. Add Deployment Scripts to package.json

Update `apps/api/package.json`:

```json
{
  "scripts": {
    "deploy": "./deploy.sh",
    "logs": "aws logs tail /ecs/api --follow --region ap-northeast-1"
  }
}
```

## Monitoring

### CloudWatch Dashboard

Create a simple dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name JapanOpenStaysApi \
  --dashboard-body file://cloudwatch-dashboard.json
```

Create `cloudwatch-dashboard.json`:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", { "stat": "Average" }],
          [".", "MemoryUtilization", { "stat": "Average" }]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-1",
        "title": "ECS Metrics"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", { "stat": "Average" }],
          [".", "RequestCount", { "stat": "Sum" }]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-1",
        "title": "ALB Metrics"
      }
    }
  ]
}
```

## Troubleshooting

### Service Won't Start

```bash
# AI: Check service events
aws ecs describe-services \
  --cluster JapanOpenStaysApiCluster \
  --services ApiService \
  --region ap-northeast-1 \
  --query 'services[0].events[:5]'

# AI: Check task definition
aws ecs describe-task-definition \
  --task-definition ApiTaskDef \
  --region ap-northeast-1
```

### Check Container Logs

```bash
# AI: Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster JapanOpenStaysApiCluster \
  --service-name ApiService \
  --region ap-northeast-1 \
  --query 'taskArns[0]' \
  --output text)

# AI: View logs
aws ecs describe-tasks \
  --cluster JapanOpenStaysApiCluster \
  --tasks $TASK_ARN \
  --region ap-northeast-1
```

### Health Check Failing

```bash
# AI: Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN \
  --region ap-northeast-1
```

## Verification

- [ ] Docker image builds without errors
- [ ] Image successfully pushed to ECR
- [ ] ECS service updates and stabilizes
- [ ] Health check endpoint returns 200
- [ ] API endpoints accessible via ALB
- [ ] CloudWatch logs show application starting
- [ ] No errors in service events
- [ ] Target health checks pass

## Dependencies

- Task 03: CDK infrastructure
- Task 04: NestJS backend

## Next Task

Task 06: Implement Crawlee scraper with AI integration
