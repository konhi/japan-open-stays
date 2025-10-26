# Task 03: AWS CDK Infrastructure

## Goal

Build AWS CDK stacks for DynamoDB, S3, ECS (API), and Amplify (frontend).

## Implementation Steps

### 1. Initialize CDK Project

```bash
cd infrastructure
pnpm add aws-cdk-lib constructs @aws-cdk/aws-amplify-alpha
pnpm add -D @types/node
```

Create `infrastructure/package.json`:

```json
{
  "name": "@japan-open-stays/infrastructure",
  "version": "1.0.0",
  "bin": {
    "infrastructure": "bin/app.js"
  },
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "cdk": "cdk"
  }
}
```

### 2. CDK App Entry Point

Create `bin/app.ts`:

```typescript
#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { StorageStack } from '../lib/storage-stack'
import { DatabaseStack } from '../lib/database-stack'
import { ApiStack } from '../lib/api-stack'
import { FrontendStack } from '../lib/frontend-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
}

const storageStack = new StorageStack(app, 'JapanOpenStaysStorage', { env })
const databaseStack = new DatabaseStack(app, 'JapanOpenStaysDatabase', { env })
const apiStack = new ApiStack(app, 'JapanOpenStaysApi', {
  env,
  listingsTable: databaseStack.listingsTable,
  rawHtmlBucket: storageStack.rawHtmlBucket,
})
const frontendStack = new FrontendStack(app, 'JapanOpenStaysFrontend', {
  env,
  apiUrl: apiStack.apiUrl,
})
```

### 3. Storage Stack (S3)

Create `lib/storage-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export class StorageStack extends cdk.Stack {
  public readonly rawHtmlBucket: s3.Bucket

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // AI: S3 bucket for storing raw HTML from scraper
    this.rawHtmlBucket = new s3.Bucket(this, 'RawHtmlBucket', {
      bucketName: `${cdk.Stack.of(this).account}-japan-open-stays-raw-html`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          // AI: Keep raw HTML for 90 days for reprocessing
          expiration: cdk.Duration.days(90),
        },
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    new cdk.CfnOutput(this, 'RawHtmlBucketName', {
      value: this.rawHtmlBucket.bucketName,
    })
  }
}
```

### 4. Database Stack (DynamoDB)

Create `lib/database-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import { Construct } from 'constructs'

export class DatabaseStack extends cdk.Stack {
  public readonly listingsTable: dynamodb.Table

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // AI: DynamoDB table for listings - no GSIs needed (client-side filtering)
    this.listingsTable = new dynamodb.Table(this, 'ListingsTable', {
      tableName: 'japan-open-stays-listings',
      partitionKey: {
        name: 'listing_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    })

    new cdk.CfnOutput(this, 'ListingsTableName', {
      value: this.listingsTable.tableName,
    })
  }
}
```

### 5. API Stack (ECS Fargate)

Create `lib/api-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

interface ApiStackProps extends cdk.StackProps {
  listingsTable: dynamodb.Table
  rawHtmlBucket: s3.Bucket
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props)

    // AI: VPC for ECS Fargate
    const vpc = new ec2.Vpc(this, 'ApiVpc', {
      maxAzs: 2,
      natGateways: 1,
    })

    // AI: ECS Cluster
    const cluster = new ecs.Cluster(this, 'ApiCluster', {
      vpc,
      containerInsights: true,
    })

    // AI: ECR repository for NestJS Docker image
    const repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'japan-open-stays-api',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // AI: Fargate task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    })

    const container = taskDefinition.addContainer('ApiContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'api' }),
      environment: {
        DYNAMODB_TABLE_NAME: props.listingsTable.tableName,
        S3_BUCKET_NAME: props.rawHtmlBucket.bucketName,
      },
    })

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    })

    // AI: Grant DynamoDB and S3 permissions
    props.listingsTable.grantReadWriteData(taskDefinition.taskRole)
    props.rawHtmlBucket.grantReadWrite(taskDefinition.taskRole)

    // AI: Fargate service
    const service = new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    })

    // AI: Application Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, 'ApiLoadBalancer', {
      vpc,
      internetFacing: true,
    })

    const listener = lb.addListener('ApiListener', {
      port: 80,
      open: true,
    })

    listener.addTargets('ApiTarget', {
      port: 3000,
      targets: [service],
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
      },
    })

    this.apiUrl = `http://${lb.loadBalancerDnsName}`

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
    })

    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: repository.repositoryUri,
    })
  }
}
```

### 6. Frontend Stack (Amplify)

Create `lib/frontend-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib'
import * as amplify from '@aws-cdk/aws-amplify-alpha'
import { Construct } from 'constructs'

interface FrontendStackProps extends cdk.StackProps {
  apiUrl: string
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props)

    const app = new amplify.App(this, 'FrontendApp', {
      appName: 'japan-open-stays',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'YOUR_GITHUB_USERNAME',
        repository: 'japan-open-stays',
        oauthToken: cdk.SecretValue.secretsManager('github-token'),
      }),
      environmentVariables: {
        NEXT_PUBLIC_API_URL: props.apiUrl,
      },
      buildSpec: cdk.aws_codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            frontend: {
              phases: {
                preBuild: {
                  commands: ['cd apps/web', 'npm ci'],
                },
                build: {
                  commands: ['npm run build'],
                },
              },
              artifacts: {
                baseDirectory: '.next',
                files: ['**/*'],
              },
              cache: {
                paths: ['node_modules/**/*'],
              },
            },
          },
        ],
      }),
    })

    const mainBranch = app.addBranch('main')

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://main.${app.defaultDomain}`,
    })
  }
}
```

### 7. CDK Configuration

Create `cdk.json`:

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/app.ts",
  "context": {
    "@aws-cdk/core:enableStackNameDuplicates": true,
    "aws-cdk:enableDiffNoFail": true,
    "@aws-cdk/core:stackRelativeExports": true
  }
}
```

Create `tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "commonjs",
    "target": "ES2022",
    "outDir": "cdk.out"
  },
  "include": ["bin", "lib"],
  "exclude": ["node_modules"]
}
```

## Deployment Commands

```bash
# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1

# Deploy all stacks
cdk deploy --all

# Deploy specific stack
cdk deploy JapanOpenStaysDatabase
```

## Verification

- [ ] All stacks synthesize without errors (`cdk synth`)
- [ ] DynamoDB table created with correct schema
- [ ] S3 bucket created with lifecycle rules
- [ ] ECS cluster and service configured
- [ ] ALB health check configured
- [ ] Amplify app connected to GitHub

## Dependencies

- Task 02: Shared types (for reference)

## Next Task

Task 04: Implement NestJS backend
