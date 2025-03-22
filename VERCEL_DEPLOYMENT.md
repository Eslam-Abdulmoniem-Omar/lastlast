# Vercel Deployment Guide

This guide will help you deploy your project to Vercel and ensure it displays the same as it does locally.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Git installed on your local machine
- Node.js and npm installed

## Step 1: Push your code to GitHub

First, make sure your code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Set up Environment Variables

Before deploying, make sure to set up all required environment variables in Vercel:

1. Log in to your Vercel account
2. Go to your project dashboard
3. Navigate to the "Settings" tab
4. Select "Environment Variables"
5. Add the following environment variables (copy values from your `.env` or `.env.local` file):

```
RAPIDAPI_KEY
RAPIDAPI_YOUTUBE_HOST
RAPIDAPI_TIKTOK_HOST
OPENAI_API_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

## Step 3: Deploy to Vercel

### Option 1: Deploy via Vercel UI

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure the project with the following settings:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next
   - Install Command: npm install && npm run install-python-deps
4. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:

   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel --prod
   ```

## Troubleshooting

If your deployment doesn't match your local environment:

1. **Environment Variables**: Ensure all required environment variables are set in Vercel
2. **API Routes**: Check that Python API routes are properly configured in `vercel.json`
3. **Build Errors**: Check the Vercel deployment logs for any build errors
4. **Runtime Errors**: Use Vercel Logs to identify any runtime errors

## Need Help?

If you encounter any issues, refer to the Vercel documentation at https://vercel.com/docs or open an issue in your GitHub repository.
