#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}LINE秘書TASK テストスクリプト${NC}"

# Parse command line arguments
TEST_TYPE=${1:-all}
WATCH=${2:-false}

echo -e "${YELLOW}Test type: $TEST_TYPE${NC}"

# Run tests based on type
case $TEST_TYPE in
    unit)
        echo -e "${YELLOW}Running unit tests...${NC}"
        if [ "$WATCH" = "watch" ]; then
            pnpm -r run test -- --watch
        else
            pnpm -r run test
        fi
        ;;
    lint)
        echo -e "${YELLOW}Running linter...${NC}"
        pnpm -r run lint
        ;;
    typecheck)
        echo -e "${YELLOW}Running type checking...${NC}"
        pnpm -r run typecheck
        ;;
    build)
        echo -e "${YELLOW}Testing build...${NC}"
        pnpm -r run build
        ;;
    e2e)
        echo -e "${YELLOW}Running E2E tests...${NC}"
        echo -e "${RED}E2E tests not implemented yet${NC}"
        ;;
    all)
        echo -e "${YELLOW}Running all tests...${NC}"
        
        echo -e "${YELLOW}1. Type checking...${NC}"
        pnpm -r run typecheck
        
        echo -e "${YELLOW}2. Linting...${NC}"
        pnpm -r run lint
        
        echo -e "${YELLOW}3. Unit tests...${NC}"
        pnpm -r run test
        
        echo -e "${YELLOW}4. Build test...${NC}"
        pnpm -r run build
        ;;
    *)
        echo -e "${RED}Error: Unknown test type '$TEST_TYPE'${NC}"
        echo -e "${YELLOW}Available types: unit, lint, typecheck, build, e2e, all${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Tests completed successfully!${NC}"