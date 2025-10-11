# ⚡ Quick Start Guide

Get your WordCloud app running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

### Create Project
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Wait for it to be ready (1-2 minutes)

### Run Migration
1. Go to SQL Editor in Supabase dashboard
2. Copy & paste contents from `supabase/migrations/001_initial_schema.sql`
3. Click "Run"

### Enable Realtime
1. Go to Database → Replication
2. Enable replication for the `entries` table

### Get API Keys
1. Go to Settings → API
2. Copy your Project URL and anon key

## 3. Configure Environment

Create `.env` file:

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 5. Test It Out!

1. Click "Create New Session"
2. Enter a title (e.g., "Test Session")
3. Click "Create Session"
4. Open the join link in another browser/device
5. Enter a nickname and submit words!

## Next Steps

- 📖 Read the full [README](./README.md) for more details
- 🚀 Deploy to Netlify - see [DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- 🗄️ Detailed Supabase setup - see [SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)

## Troubleshooting

**Can't create session?**
- Check .env file has correct Supabase URL and key
- Restart dev server after creating .env

**Real-time not working?**
- Enable Realtime in Supabase dashboard
- Check browser console for errors

**Build errors?**
- Delete node_modules and run `npm install` again
- Make sure you're using Node.js 18+

---

Happy word clouding! 🎉
