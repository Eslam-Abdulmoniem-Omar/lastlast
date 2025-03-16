#!/bin/bash

# Simple deployment script for SayFluent

echo "Starting SayFluent deployment..."

# Pull latest changes from repository
echo "Pulling latest changes from repository..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

# Build application for production
echo "Building application for production..."
npm run build

# Check if .env file exists, if not, create it from .env.example
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "NOTE: Please update the .env file with your actual API keys and configuration!"
fi

echo "Deployment preparation complete!"
echo "To start the server, run: npm start" 