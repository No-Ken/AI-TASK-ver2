#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}LINE秘書TASK セットアップスクリプト${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm@8.10.0
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Build shared packages
echo -e "${YELLOW}Building shared packages...${NC}"
pnpm --filter @line-secretary/shared build
pnpm --filter @line-secretary/database build

# Copy environment files
echo -e "${YELLOW}Setting up environment files...${NC}"

if [ ! -f "apps/bot/.env" ]; then
    cp apps/bot/.env.example apps/bot/.env
    echo -e "${YELLOW}Created apps/bot/.env from example${NC}"
fi

if [ ! -f "apps/liff/.env.local" ]; then
    cp apps/liff/.env.example apps/liff/.env.local
    echo -e "${YELLOW}Created apps/liff/.env.local from example${NC}"
fi

if [ ! -f "apps/liff-api/.env" ]; then
    cp apps/liff-api/.env.example apps/liff-api/.env
    echo -e "${YELLOW}Created apps/liff-api/.env from example${NC}"
fi

if [ ! -f "apps/worker/.env" ]; then
    cp apps/worker/.env.example apps/worker/.env
    echo -e "${YELLOW}Created apps/worker/.env from example${NC}"
fi

# Setup Git hooks
if [ -d ".git" ]; then
    echo -e "${YELLOW}Setting up Git hooks...${NC}"
    pnpm prepare
fi

echo -e "${GREEN}Setup completed!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Update environment variables in .env files"
echo -e "2. Set up Firebase project and download service account key"
echo -e "3. Set up LINE Developer account and channels"
echo -e "4. Run 'pnpm dev' to start development servers"