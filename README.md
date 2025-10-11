# 🕊️ WordCloud App - Multilingual Real-Time Word Cloud

A simple, engaging, and mobile-friendly word cloud web app for group reflection and sharing sessions. Built with React, Vite, Supabase, and deployed on Netlify.

## ✨ Features

- **Real-Time Collaboration**: Watch words appear instantly as participants submit them
- **Multilingual Support**: Chinese, English, and Malay with intelligent text normalization
- **Smart Grouping**: Automatically groups similar phrases (e.g., "I love badminton" and "Saya suka badminton")
- **Mobile-First Design**: Optimized for phones, tablets, and desktop
- **Big Screen Mode**: Fullscreen projector display for group sessions
- **No Login Required**: Easy participation via shareable links and QR codes
- **Free Forever**: Hosted on Netlify's free tier with Supabase free tier

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account (free tier)
- A Netlify account (free tier)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd wordcloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```bash
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🗄️ Supabase Setup

### 1. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned

### 2. Run the Migration

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and execute the SQL

This will create:
- `sessions` table for storing word cloud sessions
- `entries` table for storing participant submissions
- Indexes for better performance
- Row Level Security (RLS) policies for public access

### 3. Enable Realtime

1. Go to **Database → Replication** in Supabase dashboard
2. Find the `entries` table
3. Enable replication for the `entries` table

### 4. Get Your API Keys

1. Go to **Settings → API** in Supabase dashboard
2. Copy your **Project URL** and **anon public** key
3. Use these in your `.env` file

## 🌐 Netlify Deployment

### Option 1: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the build settings from `netlify.toml`
6. Add environment variables:
   - Go to **Site settings → Environment variables**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
7. Deploy!

### Option 2: Manual Deploy

```bash
npm run build
npx netlify deploy --prod
```

## 📖 Usage Guide

### Creating a Session

1. Click "Create New Session"
2. Enter a title and description
3. Click "Create Session"
4. You'll be redirected to the Big Screen view
5. Share the join link or QR code with participants

### Joining a Session

1. Open the join link on your phone/device
2. Enter a nickname (or generate a random one)
3. Choose your text color
4. Click "Start Contributing"
5. Type words or phrases and submit!

### Big Screen Mode

- Perfect for projector display during group sessions
- Shows real-time word cloud with smooth animations
- Click fullscreen button for immersive view
- Displays participant count and word count

### Dashboard

- View all sessions you've created
- Copy join links and display QR codes
- Open big screen or join sessions
- Delete old sessions

## 🎨 How Text Normalization Works

The app uses a multi-language normalization system:

### Examples

| Original Input              | Normalized      | Language |
| --------------------------- | --------------- | -------- |
| 我喜欢打羽球                | 打羽球          | Chinese  |
| 打羽球                      | 打羽球          | Chinese  |
| I love badminton            | badminton       | English  |
| Saya suka main badminton    | badminton       | Malay    |
| 打羽球很好玩                | 打羽球          | Chinese  |

All of these would be grouped together if they normalize to the same root phrase!

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Routing**: React Router (HashRouter for Netlify compatibility)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Text Processing**: Compromise (NLP library)
- **QR Codes**: qrcode.react
- **Hosting**: Netlify (free tier)

## 📁 Project Structure

```
wordcloud/
├── public/                  # Static assets
├── src/
│   ├── components/          # React components
│   │   ├── ColorPicker.tsx
│   │   └── WordCloud.tsx
│   ├── pages/              # Page components
│   │   ├── Home.tsx
│   │   ├── CreateSession.tsx
│   │   ├── JoinSession.tsx
│   │   ├── BigScreen.tsx
│   │   └── Dashboard.tsx
│   ├── lib/                # Utilities
│   │   ├── supabase.ts
│   │   └── textNormalization.ts
│   ├── types/              # TypeScript types
│   ├── styles/             # Global styles
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/         # Database migrations
├── netlify.toml           # Netlify configuration
├── tailwind.config.js     # Tailwind configuration
└── package.json
```

## 🎯 Features in Detail

### Color System

Participants choose from 6 predefined colors:
- Red (#ef4444)
- Blue (#3b82f6)
- Green (#10b981)
- Purple (#8b5cf6)
- Yellow (#eab308)
- Orange (#f97316)

Words with multiple colors show color indicator dots on hover.

### Word Cloud Algorithm

- Uses spiral positioning for balanced layout
- Font size scales with word frequency
- Smooth animations on entry/exit
- Collision avoidance for better readability

### Realtime Updates

- Uses Supabase Realtime subscriptions
- Sub-second latency for word submissions
- Automatic reconnection on network issues
- Graceful handling of slow connections

## 🆓 Free Tier Limits

### Netlify
- 100 GB bandwidth/month
- 300 build minutes/month
- Unlimited sites
- Free HTTPS

### Supabase
- 500 MB database space
- 2 GB file storage
- 50 MB file uploads
- 2 GB bandwidth/month
- Realtime connections included

These limits are more than enough for small to medium-sized groups!

## 🔒 Security Notes

- The Supabase anon key is safe to use in the frontend
- Row Level Security (RLS) policies control access
- No authentication required (public participation model)
- Sessions are not password-protected (by design)

## 🐛 Troubleshooting

### Words not appearing in real-time?
- Check that Realtime is enabled for the `entries` table in Supabase
- Verify your Supabase URL and anon key are correct
- Check browser console for errors

### Build failing on Netlify?
- Ensure environment variables are set in Netlify dashboard
- Check that Node version is 18+ (set in netlify.toml)
- Verify all dependencies are in package.json

### QR code not working?
- Make sure the `public_url` field is correctly populated in the database
- Check that the URL uses your actual domain (not localhost)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for any purpose!

## 💖 Acknowledgments

Built with love for community groups, classrooms, and youth ministries around the world.

---

Made with ❤️ using React, Supabase, and Netlify
