FROM node:18-alpine AS base

RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy all packages and worker app
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @line-secretary/shared build
RUN pnpm --filter @line-secretary/database build

# Build worker application
RUN pnpm --filter @line-secretary/worker build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/worker/dist ./dist
COPY --from=base /app/apps/worker/package.json ./
COPY --from=base /app/apps/worker/node_modules ./node_modules

EXPOSE 8081

CMD ["node", "dist/index.js"]