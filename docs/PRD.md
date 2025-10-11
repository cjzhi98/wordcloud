# 🕊️ WordCloud App – Multilingual Real-Time Word Cloud (Final PRD)

## 1. Overview

A simple, engaging, and mobile-friendly **Word Cloud web app** for group reflection or sharing sessions.
Participants join via a share link, submit words or short phrases, and watch the live word cloud update instantly — powered by **React (Vite)** on **Netlify** with **Supabase Realtime** as the database.

The app is **frontend-only**, multilingual (Chinese, English, Malay), and completely **free to host forever**.

---

## 2. Goals

-   Create a fun, interactive reflection tool for small groups, classrooms, or youth sessions.
-   100% frontend — no backend server required.
-   Support Chinese, English, and Malay phrase input.
-   Allow users to freely express thoughts with color and nickname personalization.
-   Display real-time, aggregated, and animated word clouds.

---

## 3. Core Features

### 🧑‍💻 Session Management

-   Users can **create unlimited sessions**.
-   Each session includes:

    -   `title`
    -   `description`
    -   `creator_name`
    -   Auto-generated `session_id` (UUID)

-   Generates a **shareable join link + QR code** (e.g., `https://wordcloud.netlify.app/join/:session_id`).
-   Creator can open a **Big Screen View** for projector display.

### 🎈 Participant Interaction

-   Join via link or QR code.
-   Enter nickname manually **or generate a random cute nickname** (e.g., “Joyful Dove”, “Radiant Star”, “Gentle Panda”).
-   Choose a text color (palette: red, blue, green, purple, yellow, orange).
-   Participants can **change color anytime**; new submissions use the latest color.
-   Submit words or short phrases.
-   Watch live updates on the shared word cloud instantly.

### ☁️ Real-Time Word Cloud

-   Uses **Supabase Realtime** for instant sync.
-   **Stores all original phrases** as entered by users.
-   Performs **client-side normalization** for grouping similar or semantically related phrases.

    -   Removes filler words (我, 很, 的, suka, like, love, etc.)
    -   Identifies root phrases (e.g., “打羽球” → “羽球”, “I love badminton” → “badminton”).

-   Aggregates and scales display size dynamically based on frequency.
-   Smooth animations using **Framer Motion**.
-   Supports **light/dark themes** and **mobile-first layout**.

---

## 4. Architecture (Frontend-Only Stack)

| Component             | Platform                   | Description                             |
| --------------------- | -------------------------- | --------------------------------------- |
| Frontend              | Netlify                    | React + Vite + Tailwind + Framer Motion |
| Database              | Supabase                   | Realtime Postgres with `anon` key       |
| Hosting               | Netlify (Free)             | Static hosting with HTTPS and env vars  |
| Auth                  | None                       | Public participation                    |
| Backend               | None                       | All logic handled in client             |
| Environment Variables | `.env` + Netlify Dashboard | Inject Supabase URL + anon key securely |

### 🧱 Data Flow

1. User submits a phrase.
2. App normalizes text in frontend.
3. App inserts **original text** into Supabase `entries` table.
4. Supabase Realtime broadcasts new entries to all clients.
5. The frontend groups normalized phrases and updates cloud dynamically.

---

## 5. Database Schema (Supabase)

### `sessions`

| Column       | Type        | Description           |
| ------------ | ----------- | --------------------- |
| id           | UUID        | Primary key           |
| title        | text        | Session title         |
| description  | text        | Session description   |
| creator_name | text        | Optional creator name |
| public_url   | text        | Shareable join link   |
| created_at   | timestamptz | Timestamp             |

### `entries`

| Column           | Type        | Description                                       |
| ---------------- | ----------- | ------------------------------------------------- |
| id               | UUID        | Primary key                                       |
| session_id       | UUID        | FK to sessions                                    |
| text             | text        | Original phrase entered by participant            |
| normalized_text  | text        | Simplified or root version (computed client-side) |
| color            | text        | Color chosen by participant                       |
| participant_name | text        | Manual or generated nickname                      |
| created_at       | timestamptz | Timestamp                                         |

✅ `normalized_text` is computed client-side for grouping. The original `text` is preserved.

---

## 6. Environment Variables

In local `.env` (not committed to GitHub):

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

In Netlify → **Site Settings → Build & Deploy → Environment Variables**
Add the same keys. Netlify injects them automatically during build.

✅ The `anon` key is safe for public use under Supabase RLS.

---

## 7. Multilingual Normalization Strategy

To group similar phrases across Chinese, English, and Malay, the app uses **lightweight NLP libraries**:

### 🧠 Implementation

```js
import nlp from "compromise"; // English + Malay
import stopword from "stopword"; // optional English stopwords

function normalizeText(text) {
	let normalized = text.toLowerCase();
	normalized = nlp(normalized).normalize({ punctuation: true }).out("root");

	// Remove simple Malay + Chinese filler words
	const stopwords = [
		"我",
		"的",
		"很",
		"喜欢",
		"觉得",
		"是",
		"saya",
		"aku",
		"yang",
		"ialah",
		"adalah",
	];
	stopwords.forEach((word) => {
		const regex = new RegExp(word, "gi");
		normalized = normalized.replace(regex, "");
	});

	return normalized.trim();
}
```

✅ Works for mixed Chinese–English–Malay phrases.
✅ Keeps it all in the frontend — no AI or backend required.

---

## 8. Example: Grouping and Visualization

### User Inputs

| Participant | Original Text            | Color  | Nickname       |
| ----------- | ------------------------ | ------ | -------------- |
| A           | 我喜欢打羽球             | Blue   | Joyful Panda   |
| B           | 打羽球                   | Green  | Radiant Dove   |
| C           | I love badminton         | Orange | Gentle Star    |
| D           | Saya suka main badminton | Purple | Kind Angel     |
| E           | 打羽球很好玩             | Red    | Happy Shepherd |
| F           | 我喜欢敬拜               | Yellow | Bright Light   |

### Normalized Results

| text                     | normalized_text |
| ------------------------ | --------------- |
| 我喜欢打羽球             | 打羽球          |
| 打羽球                   | 打羽球          |
| I love badminton         | badminton       |
| Saya suka main badminton | badminton       |
| 打羽球很好玩             | 打羽球          |
| 我喜欢敬拜               | 敬拜            |

### Aggregation

```js
{
  打羽球: 3,
  badminton: 2,
  敬拜: 1
}
```

### Word Cloud Display

| Word      | Count | Relative Size |
| --------- | ----- | ------------- |
| 打羽球    | 3     | 80px          |
| badminton | 2     | 70px          |
| 敬拜      | 1     | 40px          |

Visually:

```
🟦 打羽球 🟩 打羽球 🟥 打羽球  🟧 badminton 🟪 badminton 🟨 敬拜
```

-   Each word keeps its original color.
-   Word size reflects combined frequency across languages.
-   Adding new similar phrases (“I really love badminton”, “我很喜欢打羽球”) will enlarge their root terms dynamically.

---

## 9. UI / UX Design

-   **Mobile-first**, minimal interface.
-   Input area with nickname and color picker.
-   Animated word cloud below input.
-   Floating button to toggle between “Add Word” and “View Cloud”.
-   **Big Screen mode:** fullscreen animated cloud for sharing sessions.
-   Fonts: Noto Sans TC (Chinese) + Poppins (English + Malay).

---

## 10. Hosting & Deployment

### 🌐 Netlify

-   Build command: `npm run build`
-   Publish directory: `dist`
-   Free HTTPS, automatic redeploy from GitHub.

### 💸 Free Tier

| Feature       | Limit         | Notes                        |
| ------------- | ------------- | ---------------------------- |
| Bandwidth     | 100 GB/month  | Thousands of users per month |
| Build minutes | 300 min/month | Ample for hobby projects     |
| Hosting       | No expiry     | Site stays online forever    |

---

## 11. Future Enhancements (v2)

-   AI-powered phrase similarity across languages (打羽球 = badminton).
-   Emoji and image word cloud support.
-   Export to PNG / PDF.
-   Session moderation and freeze mode.
-   Tooltip showing original phrases grouped under each root word.

---
