// Client-side text normalization for multilingual phrases (Chinese, English, Malay)
// Uses compromise for English/Malay root word extraction and custom logic for Chinese

import nlp from 'compromise';

const CHINESE_FILLER_WORDS = [
  '我', '你', '他', '她', '它', '们',
  '的', '地', '得',
  '很', '非常', '特别', '挺', '好', '真',
  '喜欢', '爱', '想', '要', '觉得',
  '是', '在', '有', '了',
  '也', '都', '还', '就',
  '这', '那', '哪',
];

const ENGLISH_FILLER_WORDS = [
  'i', 'me', 'my', 'mine',
  'you', 'your', 'yours',
  'he', 'she', 'it', 'his', 'her', 'its',
  'we', 'our', 'ours',
  'they', 'their', 'theirs',
  'the', 'a', 'an',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had',
  'do', 'does', 'did',
  'will', 'would', 'should', 'could',
  'and', 'or', 'but',
  'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'like', 'love', 'want', 'need',
  'very', 'really', 'so', 'too',
  'this', 'that', 'these', 'those',
];

const MALAY_FILLER_WORDS = [
  'saya', 'aku', 'kamu', 'dia', 'mereka',
  'yang', 'adalah', 'ialah',
  'suka', 'cinta', 'mahu', 'nak',
  'sangat', 'sekali', 'amat',
  'di', 'ke', 'dari', 'untuk',
  'dan', 'atau', 'tetapi',
  'ini', 'itu',
];

export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Step 1: Use compromise for English/Malay normalization
  let normalized = text.trim().toLowerCase();

  // Remove punctuation for all languages
  normalized = normalized.replace(/[.,!?;:。,!?;:""''「」『』【】()（）]/g, ' ');

  // Use compromise to extract root forms and remove common stop words
  const doc = nlp(normalized);
  doc.normalize({ punctuation: true, case: true, whitespace: true });
  normalized = doc.text();

  // Step 2: Remove language-specific filler words
  let words = normalized.split(/\s+/).filter(Boolean);

  // Filter out filler words from all three languages
  words = words.filter(word => {
    return !CHINESE_FILLER_WORDS.includes(word) &&
           !ENGLISH_FILLER_WORDS.includes(word) &&
           !MALAY_FILLER_WORDS.includes(word);
  });

  // Step 3: Additional processing for specific patterns
  const result = words.join(' ').trim();

  // If we filtered everything out, return a cleaned version of the original
  if (!result) {
    return text.trim().toLowerCase().replace(/[.,!?;:。,!?;:""''「」『』【】()（）]/g, '').trim();
  }

  return result;
}

export function generateCuteNickname(): string {
  const adjectives = [
    'Joyful', 'Radiant', 'Gentle', 'Brave', 'Kind',
    'Cheerful', 'Peaceful', 'Faithful', 'Loving', 'Gracious',
    'Humble', 'Patient', 'Hopeful', 'Blessed', 'Wise',
    'Pure', 'Bright', 'Grateful', 'Warm', 'Sweet'
  ];

  const nouns = [
    'Dove', 'Shepherd', 'Angel', 'Panda', 'Star',
    'Light', 'Lamb', 'Lion', 'Eagle', 'Sparrow',
    'Fish', 'Seed', 'Tree', 'River', 'Mountain',
    'Flower', 'Cloud', 'Butterfly', 'Deer', 'Pearl'
  ];

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${randomAdjective} ${randomNoun}`;
}
