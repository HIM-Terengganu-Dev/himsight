# Clean Redeploy Guide

If the 404 issue persists, follow these steps for a clean redeploy:

## Option 1: Fresh Vercel Project (Recommended)

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Delete the current project (Settings → Delete Project)
   - Create a new project
   - Connect it to the same GitHub repository
   - Add environment variables:
     - `HIM_WELLNESS_TTDI_DB`
     - `HIM_WELLNESS_TTDI_DB_DDL`

2. **Deploy:**
   - Vercel will automatically detect Next.js and deploy

## Option 2: Clean GitHub Repository

If you want to start fresh with GitHub too:

1. **Backup your code locally** (already done)

2. **Delete GitHub repository:**
   - Go to https://github.com/HIM-Terengganu-Dev/himsight
   - Settings → Scroll down → Delete this repository

3. **Create new repository:**
   - Create a new repo with the same name
   - Push your code:
     ```bash
     git remote remove origin
     git remote add origin https://github.com/HIM-Terengganu-Dev/himsight.git
     git push -u origin main
     ```

4. **Connect to Vercel:**
   - Create new Vercel project
   - Connect to the new GitHub repo
   - Add environment variables
   - Deploy

## Current Status

The code structure is correct. The issue might be:
- Vercel build cache
- Environment variable configuration
- Project settings in Vercel

Try Option 1 first (just delete and recreate Vercel project) - this is usually faster and keeps your git history.
