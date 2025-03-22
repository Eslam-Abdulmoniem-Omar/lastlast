#!/bin/bash

# Exit on error
set -e

echo "Starting Vercel deployment..."

# Install Vercel CLI if not already installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if logged in to Vercel
vercel whoami &> /dev/null || {
    echo "Please login to Vercel:"
    vercel login
}

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!" 