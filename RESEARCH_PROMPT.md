# Research Prompt: Real-Time Multilingual Word Cloud Generator

## Project Context

I am building a **real-time collaborative word cloud web application** where multiple participants can submit words/phrases simultaneously, and the results are displayed on a big screen with live updates. The application needs to handle **Chinese (中文), English, and Malay (Bahasa Malaysia)** text intelligently.

---

## Current Implementation

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL + Realtime)
- **NLP Libraries**:
  - `compromise` - English/Malay processing
  - `jieba-wasm` - Chinese word segmentation (WebAssembly)
  - `franc-min` - Language detection

### Current Features
- Real-time word submission and display
- Basic word cloud visualization with collision detection
- Color-coded entries per participant
- Multi-language support (Chinese, English, Malay)
- Spam filtering and gibberish detection
- Semantic grouping of similar phrases
- Tiered display (S/A/B/C tiers) based on frequency
- Configurable display modes (Overview/Balanced/Detailed)

---

## Research Questions

### 1. **Advanced NLP & Text Processing**

**Question**: What are the best practices and algorithms for processing multilingual text in real-time word clouds, specifically for Chinese, English, and Malay?

**Sub-topics**:
- How should phrases be handled vs. individual words? (e.g., "i like chicken" vs. "chicken")
- What are industry standards for Chinese word segmentation in web applications?
- How to effectively group semantically similar phrases across different languages?
- Best practices for stop word removal in Chinese, English, and Malay
- Part-of-speech tagging - which tags should be prioritized for word clouds?

**Specific Scenarios**:
```
Input: "我要打羽球" (Chinese)
- Should it display as: "我要打羽球" (full phrase) or "打羽球" (filtered) or "羽球" (key noun)?

Input: "i like chicken" (English)
- Should it display as: "i like chicken" (full) or "like chicken" (filtered) or "chicken" (key noun)?

Input: "saya suka ayam" (Malay)
- Should it display as: "saya suka ayam" (full) or "suka ayam" (filtered) or "ayam" (key noun)?
```

### 2. **Word Cloud Visualization & UX**

**Question**: What are the best practices for displaying word clouds with varying amounts of data (10 words vs. 1000 words) while maintaining readability and visual hierarchy?

**Current Issues**:
- With 64+ words, the screen becomes cluttered
- Small words (count=1) can obscure important words (count=10+)
- Linear font scaling creates too many size variations

**Research Areas**:
- How do professional tools (Mentimeter, Slido, Kahoot) handle word cloud display limits?
- What is the optimal number of words to display for maximum insight extraction?
- Tiered sizing vs. logarithmic vs. linear scaling - which is best?
- How to balance "show everything" vs. "show only important items"?
- Best practices for color coding in multi-participant scenarios

### 3. **Semantic Grouping & Phrase Clustering**

**Question**: How should a word cloud group semantically related entries to reduce clutter while preserving information?

**Example Scenario**:
```
User submissions:
- "chicken" (5 times)
- "i like chicken" (3 times)
- "buy a chicken" (2 times)
- "fried chicken" (4 times)
- "鸡肉" (Chinese for chicken, 3 times)

Options:
A) Show all 5 separately (clutter)
B) Group all under "chicken" (17 total) - lose phrase context
C) Show "chicken" (big) + top phrases separately (hybrid)
D) Group cross-language: "chicken/鸡" cluster

Which approach provides best UX?
```

**Research Topics**:
- Semantic similarity algorithms for short text (1-5 words)
- Cross-language phrase clustering (English "chicken" + Chinese "鸡肉")
- Entity extraction for word clouds
- How to display grouped items with variants (tooltip? list? toggle?)

### 4. **Spam & Quality Filtering**

**Question**: What techniques effectively filter spam, gibberish, and low-quality submissions in real-time collaborative applications?

**Examples to Filter**:
```
Spam/Gibberish:
- "asdasdasd"
- "qweqweqwe"
- "aaaa"
- "ewqeqwew"
- Random keyboard mashing

Edge Cases:
- "McDonald's" - legitimate but has repeated characters
- "Mississippi" - repeated letters but valid
- Chinese single characters: "的", "了", "是" - common but low value
```

**Research Areas**:
- Real-time spam detection algorithms
- Language-specific gibberish patterns
- Dictionary-based validation (pros/cons)
- Machine learning approaches for quality scoring
- How other collaborative tools (Padlet, Miro, Kahoot) handle spam

### 5. **Real-Time Performance & Scalability**

**Question**: How to optimize word cloud rendering and NLP processing for real-time applications with 100+ concurrent participants?

**Current Setup**:
- Processing: Browser-side (WebAssembly for Chinese)
- Updates: Polling every 1 second
- Rendering: React + Framer Motion

**Scenarios to Optimize**:
- 10 participants submitting 1 word/minute = manageable
- 100 participants submitting 5 words/minute = 500 words/minute
- 1000 total entries accumulated over 30 minutes

**Research Areas**:
- Browser-side vs. server-side NLP processing trade-offs
- Incremental processing (only process new entries)
- Caching strategies for NLP results
- Virtual rendering for large word lists
- WebWorker usage for non-blocking NLP
- Comparison: Polling vs. WebSocket vs. Server-Sent Events

### 6. **Display Modes & User Controls**

**Question**: What configuration options should users have to customize their word cloud view?

**Current Settings**:
```
- Display Mode: Overview (30 words) | Balanced (50) | Detailed (100)
- Min Occurrences: 1-10 (slider)
- Semantic Grouping: ON/OFF
- Show Phrases: ON/OFF (full phrases vs. keywords only)
```

**Research Questions**:
- What do users of Mentimeter/Slido/Kahoot typically want to adjust?
- Should there be a "Presentation Mode" optimized for projectors?
- Time-based filtering (show only last 5 minutes of submissions)?
- Participant filtering (show words from specific groups)?
- Export options (what formats? what data included?)

### 7. **Multilingual Best Practices**

**Question**: How do leading real-time collaboration tools handle multilingual content mixing?

**Specific Cases**:
```
Scenario 1: Mixed language entry
Input: "I love 羽毛球 badminton"
- How to segment?
- Which language takes priority?

Scenario 2: Same concept, different languages
Input: "badminton" (English, 10 times)
Input: "羽毛球" (Chinese, 5 times)
- Should they be grouped together?
- How to display: "badminton/羽毛球" or separate?

Scenario 3: Script mixing
Input: "McDonalds 麦当劳" (brand name in English + Chinese)
- Treat as one entity or two?
```

**Research Areas**:
- Multilingual word cloud examples from academic papers
- Translation services integration (should we auto-translate?)
- Unicode handling best practices
- Font rendering for mixed scripts (CJK + Latin)

### 8. **Comparative Analysis**

**Question**: How do leading real-time word cloud tools compare?

**Tools to Research**:
1. **Mentimeter** - Industry leader
2. **Slido** (now Webex)
3. **Kahoot** - Word cloud feature
4. **Poll Everywhere**
5. **Pigeonhole Live**
6. **AhaSlides**

**Comparison Criteria**:
- How many words do they display by default?
- Do they group similar phrases?
- How do they handle multilingual input?
- What filtering options do they provide?
- What is their UX for large datasets (100+ words)?
- Do they use NLP or simple counting?
- Pricing models and feature limitations

### 9. **Academic Research**

**Question**: What do academic papers say about word cloud generation, text visualization, and collaborative information displays?

**Topics to Explore**:
- Recent papers on word cloud algorithms (2020-2025)
- Cognitive science: how users interpret word clouds
- Information visualization best practices
- Real-time collaborative visualization systems
- Multilingual NLP in web applications

**Specific Papers to Find**:
- Word cloud layout algorithms
- Semantic clustering for short text
- Real-time text analytics systems
- Collaborative filtering and spam detection

### 10. **Edge Cases & Failure Modes**

**Question**: What edge cases should be handled, and how?

**Scenarios**:
```
1. All submissions are unique (no repeats)
   - Should we still show a word cloud?
   - Or switch to a list view?

2. One word dominates (90% of submissions)
   - Should we cap the maximum size?
   - Show percentage breakdown?

3. Only gibberish/spam submitted
   - Empty state message?
   - Show notification?

4. Extremely long phrases (20+ words)
   - Truncate? Summarize? Reject?

5. Emojis and special characters
   - "❤️ love ❤️" - how to process?
   - "C++ programming" - preserve?

6. Numbers and dates
   - "2024" - filter or keep?
   - "iPhone 15" - phrase or separate?
```

---

## Desired Research Outputs

### Primary Outputs
1. **Best Practices Document**: Industry-standard approaches for multilingual real-time word clouds
2. **Algorithm Recommendations**: Specific algorithms for each processing stage (NLP, grouping, filtering, display)
3. **Competitive Analysis**: Feature comparison matrix of leading tools
4. **UX Guidelines**: Evidence-based recommendations for display limits, controls, and interaction patterns
5. **Performance Benchmarks**: Expected performance metrics for different scale scenarios
6. **Code Examples**: If available, pseudocode or library recommendations for key features

### Secondary Outputs
1. Academic paper citations relevant to word cloud generation
2. Open-source projects with similar goals
3. Known limitations and trade-offs of different approaches
4. Future trends in collaborative visualization
5. Accessibility considerations for word clouds

---

## Current Pain Points

### What Works Well
✅ Real-time updates are smooth
✅ Basic NLP processing for 3 languages
✅ Semantic grouping reduces clutter significantly
✅ Tiered display improves visual hierarchy
✅ Browser-side processing (privacy-friendly)

### What Needs Improvement
❌ **Phrase vs. Word Decision**: Unclear when to show full phrase vs. keyword
❌ **Display Limits**: No consensus on optimal word count (30? 50? 100?)
❌ **Semantic Grouping Accuracy**: Cross-language grouping needs improvement
❌ **Spam Detection**: Edge cases where valid text is flagged as spam
❌ **Visual Balance**: Large datasets still feel cluttered even with filtering
❌ **User Guidance**: Users don't know which settings to use

---

## Use Case Scenarios

### Scenario 1: Classroom Icebreaker
- **Participants**: 30 students
- **Duration**: 5 minutes
- **Prompt**: "What is your favorite food?"
- **Expected**: 30-50 words, mix of languages, some jokes/spam
- **Goal**: Quick visual summary, inclusive of all voices

### Scenario 2: Corporate Brainstorming
- **Participants**: 100 employees
- **Duration**: 30 minutes
- **Prompt**: "What should our company focus on in 2025?"
- **Expected**: 200-500 phrases, serious content, some duplicates
- **Goal**: Identify top 10-20 themes for leadership discussion

### Scenario 3: Conference Live Feedback
- **Participants**: 500 attendees
- **Duration**: 2 hours (continuous)
- **Prompt**: "What did you learn today?"
- **Expected**: 1000+ entries, diverse topics, need filtering
- **Goal**: Real-time trending topics, exportable report

---

## Technical Constraints

### Must Support
- ✅ Browser-based (no mobile app required)
- ✅ Works on projectors/big screens (1920x1080+)
- ✅ Real-time updates (< 2 second latency)
- ✅ Multilingual (Chinese, English, Malay minimum)
- ✅ No login required for participants
- ✅ Export to PNG/PDF

### Current Limitations
- ⚠️ Browser-based NLP has limited accuracy vs. server-side
- ⚠️ WebAssembly bundle size (~150KB for jieba-wasm)
- ⚠️ No persistent history (clears on page refresh)
- ⚠️ Limited to Supabase free tier (small database)

---

## Questions for Perplexity to Research

1. **What is the optimal number of words to display in a real-time word cloud for maximum insight extraction and visual clarity?**

2. **How do Mentimeter, Slido, and Kahoot handle multilingual word cloud generation? What NLP techniques do they use?**

3. **What are the best algorithms for grouping semantically similar short phrases (1-5 words) in English, Chinese, and Malay?**

4. **Should word clouds display full phrases ("i like chicken") or extract keywords ("chicken")? What does research say?**

5. **What spam detection techniques are most effective for real-time collaborative text input in educational/corporate settings?**

6. **What are the latest (2020-2025) academic papers on word cloud generation, multilingual NLP, and real-time text visualization?**

7. **How should word clouds handle cross-language semantic equivalents (e.g., "badminton" in English + "羽毛球" in Chinese)?**

8. **What is the typical scale of real-time word cloud applications? (number of participants, entries, concurrent usage)**

9. **What are the trade-offs between client-side vs. server-side NLP processing for real-time web applications?**

10. **What user controls and settings do professional word cloud tools offer, and which are most used?**

---

## Appendix: Technical Details

### Current Word Cloud Processing Pipeline
```
1. User Input → 2. Spam Filter → 3. Language Detection →
4. NLP Processing (segment + POS tag) → 5. Normalize (remove fillers) →
6. Semantic Grouping → 7. Frequency Count → 8. Tier Assignment →
9. Layout Calculation (collision detection) → 10. Render
```

### Current Tier System
- **Tier S**: Top 5 words (40-60% cumulative frequency) - 80-110px font
- **Tier A**: Next 10-15 words (20-30% frequency) - 50-70px font
- **Tier B**: Next 20-25 words - 32-48px font
- **Tier C**: Remaining words - 24-36px font, 70% opacity

### Sample Data Structure
```javascript
{
  canonical: "chicken",
  displayText: "chicken",
  keyPhrase: "chicken",
  variants: [
    { text: "chicken", count: 5, language: "en" },
    { text: "i like chicken", count: 3, language: "en" },
    { text: "鸡肉", count: 2, language: "zh" }
  ],
  totalCount: 10,
  tier: "S",
  languages: Set(["en", "zh"])
}
```

---

## Request to Perplexity

Please conduct comprehensive research on the questions above, focusing on:

1. **Evidence-based recommendations** (cite sources, papers, or industry examples)
2. **Practical implementation guidance** (not just theory)
3. **Comparative analysis** of existing tools
4. **Multilingual considerations** (specifically Chinese, English, Malay)
5. **Scalability and performance** best practices
6. **UX patterns** that have proven effective

Prioritize recent sources (2020-2025) and real-world applications over outdated academic theory. Include specific examples, code snippets, or algorithm descriptions where available.

**Thank you!**
