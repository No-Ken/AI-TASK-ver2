FROM node:18-alpine AS base

RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy all packages and liff-api app
COPY packages ./packages
COPY apps/liff-api ./apps/liff-api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @line-secretary/shared build
RUN pnpm --filter @line-secretary/database build

# Build liff-api application
RUN pnpm --filter @line-secretary/liff-api build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/liff-api/dist ./dist
COPY --from=base /app/apps/liff-api/package.json ./
COPY --from=base /app/apps/liff-api/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/index.js"]