#!/bin/bash

# ResFlow Quick Setup Script for Docker Deployment

set -e

echo "=========================================="
echo "ResFlow Docker Deployment Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate secure keys
    JWT_SECRET=$(openssl rand -hex 32)
    CRON_API_KEY=$(openssl rand -hex 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Update .env file
    sed -i "s/changeme_secure_password_here/${POSTGRES_PASSWORD}/g" .env
    sed -i "s/changeme_secure_jwt_secret_key_here/${JWT_SECRET}/g" .env
    sed -i "s/changeme_secure_cron_api_key_here/${CRON_API_KEY}/g" .env
    
    echo "✅ .env file created with generated secure keys"
    echo ""
    echo "⚠️  IMPORTANT: Review and update .env file with your configuration:"
    echo "   - BASE_URL (if using custom domain with nginx)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/docker-entrypoint.sh
chmod +x scripts/cron-runner.sh
echo "✅ Scripts are now executable"
echo ""

# Ask if user wants to build and start now
read -p "Do you want to build and start the application now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🏗️  Building Docker images..."
    docker-compose build
    
    echo ""
    echo "🚀 Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 5
    
    echo ""
    echo "📊 Service status:"
    docker-compose ps
    
    echo ""
    echo "✅ ResFlow is now running!"
    echo ""
    echo "🌐 Access the application at: http://localhost:3000"
    echo ""
    echo "📋 Useful commands:"
    echo "   - View logs: docker-compose logs -f app"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart services: docker-compose restart"
    echo "   - Check cron jobs: docker exec resflow_app crontab -l"
    echo "   - View cron logs: docker exec resflow_app tail -f /var/log/cron-daily.log"
    echo ""
else
    echo ""
    echo "✅ Setup complete! You can start the application later with:"
    echo "   docker-compose up -d"
    echo ""
fi

echo "=========================================="
echo "Setup Complete! 🎉"
echo "=========================================="
