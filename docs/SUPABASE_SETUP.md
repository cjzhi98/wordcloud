# 🗄️ Supabase Setup Guide

Complete step-by-step guide to set up Supabase for the WordCloud app.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account (free)
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: wordcloud-app (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free (perfect for this app)
5. Click **"Create new project"**
6. Wait 1-2 minutes for the project to be provisioned

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy all the SQL content
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

You should see a success message. This creates:
- ✅ `sessions` table
- ✅ `entries` table
- ✅ Indexes for performance
- ✅ Row Level Security policies

## Step 3: Enable Realtime for Entries

1. Go to **Database → Replication** in the left sidebar
2. You'll see a list of tables
3. Find the **`entries`** table
4. Toggle the switch to **enable** replication for `entries`
5. Wait a few seconds for it to activate

This allows real-time word cloud updates!

## Step 4: Get Your API Credentials

1. Go to **Settings** (bottom left gear icon)
2. Click **API** in the settings menu
3. You'll see two important values:

   - **Project URL**: `https://yourproject.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

4. Copy these values

## Step 5: Configure Your App

### For Local Development

Create a `.env` file in your project root:

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Step 4.

### For Netlify Deployment

1. Go to your Netlify site dashboard
2. Click **Site settings**
3. Go to **Build & deploy → Environment variables**
4. Click **Add a variable** and add:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://yourproject.supabase.co`
5. Add another variable:
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: Your anon key
6. Save and redeploy your site

## Step 6: Verify Everything Works

1. Start your local development server:
   ```bash
   npm run dev
   ```

2. Create a test session:
   - Open http://localhost:5173
   - Click "Create New Session"
   - Fill in title and description
   - Click "Create Session"

3. If successful, you should:
   - Be redirected to the Big Screen view
   - See the session title displayed
   - Be able to join the session from another device/browser

## Troubleshooting

### "Failed to create session" error

**Possible causes:**
- Environment variables not set correctly
- Check that `.env` file exists and has correct values
- Verify Supabase URL and key are correct (no extra spaces)

**Solution:**
```bash
# Check your .env file
cat .env

# Restart your dev server
npm run dev
```

### Real-time updates not working

**Possible causes:**
- Realtime not enabled for entries table
- Browser blocking WebSocket connections

**Solution:**
1. Go to Supabase dashboard → Database → Replication
2. Make sure `entries` table has replication enabled
3. Check browser console for WebSocket errors
4. Try a different browser or network

### RLS (Row Level Security) errors

**Possible causes:**
- Migration didn't run completely
- Policies not created

**Solution:**
1. Go to Supabase dashboard → Authentication → Policies
2. Verify that `sessions` and `entries` tables have policies
3. Re-run the migration SQL if needed

### Database connection errors

**Possible causes:**
- Wrong Supabase URL
- Wrong anon key
- Project paused (free tier pauses after inactivity)

**Solution:**
1. Verify your credentials in Settings → API
2. If project is paused, wake it up from the dashboard
3. Check that you're using the anon key, not the service_role key

## Database Schema Overview

### Sessions Table

| Column       | Type        | Description         |
| ------------ | ----------- | ------------------- |
| id           | UUID        | Primary key         |
| title        | TEXT        | Session title       |
| description  | TEXT        | Session description |
| creator_name | TEXT        | Optional            |
| public_url   | TEXT        | Share link          |
| created_at   | TIMESTAMPTZ | Creation time       |

### Entries Table

| Column           | Type        | Description                    |
| ---------------- | ----------- | ------------------------------ |
| id               | UUID        | Primary key                    |
| session_id       | UUID        | FK to sessions                 |
| text             | TEXT        | Original text input            |
| normalized_text  | TEXT        | Processed text for grouping    |
| color            | TEXT        | User-chosen color              |
| participant_name | TEXT        | Nickname (manual or generated) |
| created_at       | TIMESTAMPTZ | Timestamp                      |

## Row Level Security (RLS) Policies

The migration creates public access policies for:

- ✅ SELECT (read) - Anyone can view sessions and entries
- ✅ INSERT - Anyone can create sessions and submit entries
- ✅ UPDATE - Anyone can update sessions (for public_url)
- ✅ DELETE - Anyone can delete (for dashboard cleanup)

**Why public access?**
This app is designed for open participation without authentication. The anon key is safe to use in the frontend because RLS policies control what operations are allowed.

## Free Tier Limits

Supabase free tier includes:
- ✅ 500 MB database storage
- ✅ Unlimited API requests
- ✅ 2 GB bandwidth/month
- ✅ Up to 500 MB file storage
- ✅ Realtime connections included
- ✅ Projects pause after 1 week of inactivity (easily reactivated)

Perfect for small to medium-sized groups!

## Security Best Practices

1. **Never commit your `.env` file** - It's in `.gitignore`
2. **Use the anon key** - Not the service_role key (too powerful)
3. **Enable RLS** - Already done in migration
4. **Monitor usage** - Check Supabase dashboard regularly
5. **Regular backups** - Supabase has daily backups on free tier

## Next Steps

- ✅ Supabase setup complete!
- 📝 Continue to deployment guide
- 🚀 Deploy to Netlify
- 🎉 Share with your group!

---

Need help? Check the [main README](../README.md) or create an issue on GitHub.
