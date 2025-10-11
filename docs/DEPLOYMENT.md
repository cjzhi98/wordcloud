# 🚀 Deployment Guide - Netlify

Step-by-step guide to deploy your WordCloud app to Netlify for free.

## Prerequisites

- ✅ Supabase project set up (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- ✅ GitHub account
- ✅ Netlify account (free)
- ✅ Your code pushed to GitHub

## Method 1: GitHub Integration (Recommended)

### Step 1: Push Code to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/wordcloud.git
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [https://netlify.com](https://netlify.com)
2. Sign in (or create an account - it's free!)
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose **"Deploy with GitHub"**
5. Authorize Netlify to access your GitHub account
6. Select your `wordcloud` repository

### Step 3: Configure Build Settings

Netlify should auto-detect settings from `netlify.toml`, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Branch to deploy**: `main`

Click **"Show advanced"** if you need to set Node version (already in netlify.toml).

### Step 4: Add Environment Variables

**IMPORTANT**: Before deploying, add your Supabase credentials:

1. In the deploy settings page, scroll to **"Environment variables"**
2. Click **"Add environment variable"**
3. Add these two variables:

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://yourproject.supabase.co`

   **Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `your-anon-public-key`

4. Get these values from your Supabase dashboard → Settings → API

### Step 5: Deploy!

1. Click **"Deploy site"**
2. Wait 1-2 minutes for the build to complete
3. Once deployed, you'll get a URL like `https://random-name-123.netlify.app`

### Step 6: Customize Your Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Options"** → **"Edit site name"**
3. Choose a custom subdomain like `bccm-wordcloud.netlify.app`
4. Or add your own custom domain if you have one

## Method 2: Netlify CLI (Alternative)

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

This opens a browser window to authorize the CLI.

### Step 3: Initialize Site

```bash
netlify init
```

Follow the prompts:
- Create & configure a new site
- Choose your team
- Site name: `wordcloud` (or your preferred name)
- Build command: `npm run build`
- Directory to deploy: `dist`

### Step 4: Set Environment Variables

```bash
netlify env:set VITE_SUPABASE_URL "https://yourproject.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

### Step 5: Deploy

```bash
npm run build
netlify deploy --prod
```

## Verify Deployment

### Test Your Deployed App

1. Open your Netlify URL
2. Create a test session
3. Try joining from a different device
4. Submit some words and check real-time updates

### Common Issues and Solutions

#### Build Fails with "Module not found"

**Solution:**
```bash
# Make sure all dependencies are in package.json
npm install

# Commit and push
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

#### Environment Variables Not Working

**Solution:**
1. Go to Netlify dashboard → Site settings → Environment variables
2. Verify both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. **Important**: Variable names must start with `VITE_` for Vite to use them
4. Trigger a new deploy: **Deploys → Trigger deploy → Clear cache and deploy**

#### 404 Errors on Page Refresh

**Solution:**
The `netlify.toml` file should handle this, but if it doesn't:
1. Go to Netlify dashboard → Site settings → Build & deploy → Post processing
2. Scroll to **Asset optimization**
3. Make sure **Pretty URLs** is enabled

Or manually add redirect rules:
1. Create a `_redirects` file in the `public` folder:
   ```
   /* /index.html 200
   ```

#### Real-time Updates Not Working

**Possible causes:**
- Supabase Realtime not enabled
- WebSocket connections blocked

**Solution:**
1. Check Supabase dashboard → Database → Replication
2. Enable replication for `entries` table
3. Check browser console for WebSocket errors
4. Try disabling browser extensions (ad blockers can interfere)

## Continuous Deployment

With GitHub integration, Netlify automatically rebuilds your site when you push changes:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push

# Netlify automatically deploys!
```

You can monitor builds in the Netlify dashboard.

## Custom Domain Setup

### Using Netlify Subdomain (Free)

1. Site settings → Domain management
2. Click "Options" → "Edit site name"
3. Enter your preferred name: `your-app-name.netlify.app`

### Using Your Own Domain

1. Buy a domain from any registrar (Namecheap, GoDaddy, etc.)
2. In Netlify: Site settings → Domain management → Add custom domain
3. Follow instructions to update your domain's DNS settings
4. Netlify provides free HTTPS certificates automatically!

**DNS Settings:**
- Add a CNAME record: `www` → `your-site.netlify.app`
- Add an A record for apex domain → Netlify's IP

## Performance Optimization

Your app is already optimized, but here are some tips:

### Enable Asset Optimization (Already enabled by default)
- CSS minification ✅
- JavaScript minification ✅
- Image optimization ✅

### Enable Branch Deploys (Optional)

For testing before going live:
1. Site settings → Build & deploy → Continuous deployment
2. Enable "Deploy previews" for pull requests
3. Push to a branch and create a PR
4. Get a preview URL before merging to main

## Monitoring and Analytics

### Netlify Analytics (Optional, $9/month)

For detailed visitor analytics without cookies:
1. Site settings → Analytics
2. Enable Netlify Analytics

### Google Analytics (Free Alternative)

Add to your `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA-ID');
</script>
```

## Free Tier Limits

Netlify free tier includes:
- ✅ 100 GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ Free HTTPS
- ✅ Continuous deployment
- ✅ Instant rollbacks

Perfect for personal projects and small communities!

## Rollback to Previous Version

If something goes wrong:

1. Go to **Deploys** in Netlify dashboard
2. Find a working previous deploy
3. Click **"..."** → **"Publish deploy"**
4. Your site instantly reverts!

## Updating Your App

### Update Environment Variables

If you need to change Supabase keys:

1. Netlify dashboard → Site settings → Environment variables
2. Edit the variable
3. **Important:** Trigger a new deploy for changes to take effect
4. Deploys → Trigger deploy → Clear cache and deploy

### Update Code

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Automatically deploys!
```

## Cost Estimate

For a typical youth group or small community:

| Service | Usage | Cost |
|---------|-------|------|
| Netlify hosting | < 1GB bandwidth | **$0** |
| Supabase database | < 100MB | **$0** |
| Domain (optional) | 1 domain/year | $10-15/year |

**Total: FREE** (or ~$12/year with custom domain)

## Security Checklist

Before going live:

- ✅ Environment variables set in Netlify (not committed to git)
- ✅ `.env` file is in `.gitignore`
- ✅ Using anon key (not service_role key)
- ✅ RLS policies enabled in Supabase
- ✅ HTTPS enabled (automatic with Netlify)

## Next Steps

- 🎉 Your app is live!
- 📱 Share the URL with your group
- 📊 Create your first session
- 🔗 Generate QR codes for easy joining
- 💬 Collect feedback and iterate

---

Need help? Check the [main README](../README.md) or create an issue on GitHub.

Enjoy your real-time word cloud! 🎊
