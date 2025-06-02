FROM node:18-alpine AS base

RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy all packages
COPY packages ./packages
COPY apps/bot ./apps/bot

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @line-secretary/shared build
RUN pnpm --filter @line-secretary/database build
RUN pnpm --filter @line-secretary/line-sdk build

# Build bot application
RUN pnpm --filter @line-secretary/bot build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/bot/dist ./dist
COPY --from=base /app/apps/bot/package.json ./
COPY --from=base /app/apps/bot/node_modules ./node_modules

EXPOSE 8080

CMD ["node", "dist/index.js"]