#!/bin/bash

# AI Cost Optimization Platform Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up AI Cost Optimization Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if Docker is available (optional)
check_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker is available"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker is not available. You'll need to install PostgreSQL and Redis manually."
        DOCKER_AVAILABLE=false
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please edit .env file with your configuration before running the application"
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Setup databases with Docker
setup_databases_docker() {
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Setting up databases with Docker..."
        
        # Check if PostgreSQL container exists
        if ! docker ps -a --format 'table {{.Names}}' | grep -q "cost-opt-postgres"; then
            print_status "Starting PostgreSQL container..."
            docker run -d \
                --name cost-opt-postgres \
                -p 5432:5432 \
                -e POSTGRES_DB=cost_optimization \
                -e POSTGRES_USER=postgres \
                -e POSTGRES_PASSWORD=password \
                postgres:13-alpine
            print_success "PostgreSQL container started"
        else
            print_status "Starting existing PostgreSQL container..."
            docker start cost-opt-postgres
        fi
        
        # Check if Redis container exists
        if ! docker ps -a --format 'table {{.Names}}' | grep -q "cost-opt-redis"; then
            print_status "Starting Redis container..."
            docker run -d \
                --name cost-opt-redis \
                -p 6379:6379 \
                redis:6-alpine
            print_success "Redis container started"
        else
            print_status "Starting existing Redis container..."
            docker start cost-opt-redis
        fi
        
        # Wait for databases to be ready
        print_status "Waiting for databases to be ready..."
        sleep 5
        
        # Test PostgreSQL connection
        if docker exec cost-opt-postgres pg_isready -U postgres > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
        else
            print_warning "PostgreSQL may not be ready yet. Please wait a moment and try again."
        fi
        
        # Test Redis connection
        if docker exec cost-opt-redis redis-cli ping > /dev/null 2>&1; then
            print_success "Redis is ready"
        else
            print_warning "Redis may not be ready yet. Please wait a moment and try again."
        fi
    fi
}

# Build all workspaces
build_workspaces() {
    print_status "Building all workspaces..."
    npm run build
    print_success "All workspaces built successfully"
}

# Display setup completion message
display_completion() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. Edit the .env file with your configuration:"
    echo "   - Add your Anthropic API key"
    echo "   - Configure Azure credentials (optional)"
    echo "   - Adjust database settings if needed"
    echo ""
    echo "2. Start the development environment:"
    echo "   ${GREEN}npm run dev:full${NC}     # Start both backend and frontend"
    echo "   ${GREEN}npm run dev:backend${NC}  # Start only backend"
    echo "   ${GREEN}npm run dev${NC}          # Start only frontend"
    echo ""
    echo "3. Access the application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   Backend:   http://localhost:8000"
    echo "   Health:    http://localhost:8000/health"
    echo "   WebSocket: ws://localhost:8000"
    echo ""
    echo "4. Optional services:"
    echo "   ${GREEN}npm run mcp:azure${NC}    # Start Azure Cost MCP server"
    echo "   ${GREEN}npm run ai:dev${NC}       # Start AI Analysis Engine"
    echo ""
    echo "📚 Documentation:"
    echo "   - Main README: ./README.md"
    echo "   - Backend: ./backend/README.md"
    echo "   - Dashboard: ./dashboard/README.md"
    echo "   - AI Engine: ./ai-analysis-engine/README.md"
    echo ""
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo "🐳 Docker containers:"
        echo "   PostgreSQL: cost-opt-postgres (port 5432)"
        echo "   Redis:      cost-opt-redis (port 6379)"
        echo ""
        echo "   Stop containers: docker stop cost-opt-postgres cost-opt-redis"
        echo "   Remove containers: docker rm cost-opt-postgres cost-opt-redis"
        echo ""
    fi
    
    echo "🔧 Troubleshooting:"
    echo "   - Check logs: npm run dev:backend (in separate terminal)"
    echo "   - Verify databases: docker ps (if using Docker)"
    echo "   - Test API: curl http://localhost:8000/health"
    echo ""
}

# Main setup process
main() {
    echo "🔍 Checking prerequisites..."
    check_node
    check_docker
    
    echo ""
    echo "📦 Installing and configuring..."
    install_dependencies
    setup_environment
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        echo ""
        echo "🗄️ Setting up databases..."
        setup_databases_docker
    fi
    
    echo ""
    echo "🔨 Building project..."
    build_workspaces
    
    echo ""
    display_completion
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT

# Run main function
main