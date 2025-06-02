#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}LINE秘書TASK デプロイスクリプト${NC}"

# Check required environment variables
check_env() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: $2 is not set${NC}"
        exit 1
    fi
}

# Parse command line arguments
ENVIRONMENT=${1:-development}
SERVICES=${2:-all}

echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Services: $SERVICES${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be development, staging, or production${NC}"
    exit 1
fi

# Check required tools
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is required but not installed${NC}"; exit 1; }
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}Error: gcloud is required but not installed${NC}"; exit 1; }

# Set project variables based on environment
case $ENVIRONMENT in
    development)
        PROJECT_ID="line-secretary-task-dev"
        REGION="asia-northeast1"
        ;;
    staging)
        PROJECT_ID="line-secretary-task-staging"
        REGION="asia-northeast1"
        ;;
    production)
        PROJECT_ID="line-secretary-task"
        REGION="asia-northeast1"
        ;;
esac

echo -e "${YELLOW}Project ID: $PROJECT_ID${NC}"
echo -e "${YELLOW}Region: $REGION${NC}"

# Build and deploy function
deploy_service() {
    local service=$1
    local port=$2
    
    echo -e "${GREEN}Deploying $service...${NC}"
    
    # Build Docker image
    docker build -f infrastructure/docker/${service}.Dockerfile -t gcr.io/${PROJECT_ID}/${service}:latest .
    
    # Push to Google Container Registry
    docker push gcr.io/${PROJECT_ID}/${service}:latest
    
    # Deploy to Cloud Run
    gcloud run deploy line-secretary-${service} \
        --image gcr.io/${PROJECT_ID}/${service}:latest \
        --platform managed \
        --region ${REGION} \
        --port ${port} \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --allow-unauthenticated \
        --project ${PROJECT_ID}
    
    echo -e "${GREEN}$service deployed successfully${NC}"
}

# Deploy services
if [[ "$SERVICES" == "all" || "$SERVICES" == *"bot"* ]]; then
    deploy_service "bot" "8080"
fi

if [[ "$SERVICES" == "all" || "$SERVICES" == *"liff-api"* ]]; then
    deploy_service "liff-api" "3001"
fi

if [[ "$SERVICES" == "all" || "$SERVICES" == *"worker"* ]]; then
    deploy_service "worker" "8081"
fi

# Deploy LIFF frontend to Firebase Hosting
if [[ "$SERVICES" == "all" || "$SERVICES" == *"liff"* ]]; then
    echo -e "${GREEN}Deploying LIFF frontend...${NC}"
    
    cd apps/liff
    npm run build
    cd ../..
    
    firebase use ${PROJECT_ID}
    firebase deploy --only hosting
    
    echo -e "${GREEN}LIFF frontend deployed successfully${NC}"
fi

echo -e "${GREEN}Deployment completed!${NC}"

# Output service URLs
echo -e "${YELLOW}Service URLs:${NC}"
BOT_URL=$(gcloud run services describe line-secretary-bot --region=${REGION} --project=${PROJECT_ID} --format="value(status.url)")
API_URL=$(gcloud run services describe line-secretary-liff-api --region=${REGION} --project=${PROJECT_ID} --format="value(status.url)")
WORKER_URL=$(gcloud run services describe line-secretary-worker --region=${REGION} --project=${PROJECT_ID} --format="value(status.url)")

echo -e "Bot: $BOT_URL"
echo -e "LIFF API: $API_URL"
echo -e "Worker: $WORKER_URL"
echo -e "LIFF Frontend: https://${PROJECT_ID}.web.app"