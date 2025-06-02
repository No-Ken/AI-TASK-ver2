FROM node:18-alpine AS base

RUN npm install -g pnpm@8.10.0

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Copy all packages and liff app
COPY packages ./packages
COPY apps/liff ./apps/liff

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @line-secretary/shared build

# Build liff application
RUN pnpm --filter @line-secretary/liff build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/liff/.next ./.next
COPY --from=base /app/apps/liff/package.json ./
COPY --from=base /app/apps/liff/next.config.js ./
COPY --from=base /app/apps/liff/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]