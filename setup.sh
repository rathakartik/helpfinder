#!/bin/bash

# Email Verifier & Finder - Auto Setup Script
# This script automatically sets up and deploys the application using Docker

set -e

echo "🚀 Email Verifier & Finder - Auto Setup Script"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p logs
mkdir -p mongo-init
mkdir -p docker

# Create MongoDB initialization script
cat > mongo-init/init.js << 'EOF'
db = db.getSiblingDB('email_verifier');
db.createCollection('jobs');
db.createCollection('results');
print('Email Verifier database initialized');
EOF

echo -e "${GREEN}✅ Directories and MongoDB init script created${NC}"

# Build the application
echo ""
echo -e "${BLUE}🏗️  Building the application...${NC}"
docker-compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application built successfully${NC}"
else
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi

# Start the services
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Services started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start services. Please check the errors above.${NC}"
    exit 1
fi

# Wait for services to be ready
echo ""
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Health check
echo -e "${BLUE}🔍 Performing health checks...${NC}"

# Check if MongoDB is ready
if docker-compose exec mongo mongo --eval "print('MongoDB is ready')" email_verifier &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB is ready${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is still starting up...${NC}"
fi

# Check if backend is ready
if curl -s http://localhost:8001/api/ > /dev/null; then
    echo -e "${GREEN}✅ Backend API is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API is still starting up...${NC}"
fi

# Check if frontend is ready
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend is still starting up...${NC}"
fi

# Check if Nginx is ready
if curl -s http://localhost:80/health > /dev/null; then
    echo -e "${GREEN}✅ Nginx proxy is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx proxy is still starting up...${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Application Information:${NC}"
echo -e "   🌐 Frontend:     http://localhost:3000"
echo -e "   🔌 Backend API:  http://localhost:8001/api"
echo -e "   🏠 Full App:     http://localhost:80"
echo -e "   🗄️  MongoDB:     mongodb://localhost:27017"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo -e "   📜 View logs:           docker-compose logs -f"
echo -e "   📜 Backend logs:        docker-compose logs -f app"
echo -e "   📜 MongoDB logs:        docker-compose logs -f mongo"
echo -e "   🔄 Restart services:    docker-compose restart"
echo -e "   ⏹️  Stop services:       docker-compose down"
echo -e "   🗑️  Clean up:           docker-compose down -v"
echo ""
echo -e "${BLUE}🔧 Features Available:${NC}"
echo -e "   ✅ Single Email Verification"
echo -e "   📦 Bulk Email Verification (up to 1000 records)"
echo -e "   🔍 Single Email Finding"
echo -e "   📦 Bulk Email Finding (up to 1000 records)"
echo -e "   🌐 Proxy Support (optional)"
echo -e "   📊 Real-time Progress Tracking"
echo -e "   📥 Filtered CSV Downloads"
echo -e "   📋 Sample Templates"
echo ""
echo -e "${YELLOW}🔥 Want sales calls from leads? Go to AlexBerman.com/Mastermind 🔥${NC}"
echo ""

# Show running containers
echo -e "${BLUE}🐳 Running Containers:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✨ Email Verifier & Finder is now running!${NC}"
echo -e "${BLUE}Open your browser and go to: http://localhost${NC}"