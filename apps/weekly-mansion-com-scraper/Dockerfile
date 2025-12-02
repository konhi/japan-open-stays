# AI: Dockerfile for Apify standalone deployment (not monorepo context)
# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
FROM apify/actor-node:20 AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev for build)
RUN npm install --include=dev

# Copy source files
COPY . .

# Build the project
RUN npm run build

# Create final image
FROM apify/actor-node:20

WORKDIR /usr/src/app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev \
    && echo "Installed npm packages:" \
    && (npm list --omit=dev || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "npm version:" \
    && npm --version

# Copy built files from builder
COPY --from=builder /usr/src/app/dist ./dist

# Run the image
CMD ["node", "dist/main.js"]
