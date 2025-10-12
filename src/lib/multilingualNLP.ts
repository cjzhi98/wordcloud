// Multilingual NLP Processing Engine for Chinese, English, and Malay
// 100% Browser-compatible, no backend required

import nlp from "compromise";
import { franc } from "franc-min";

import jiebaInit from "jieba-wasm";

// Language detection using franc (ISO 639-3 codes)
const LANG_CODES: Record<string, Language> = {
	cmn: "zh", // Mandarin Chinese
	eng: "en", // English
	zsm: "ms", // Malay (Standard Malay)
	zlm: "ms", // Malay alternative code
};

export type Language = "en" | "zh" | "ms" | "mixed";
export type TokenType = "word" | "phrase" | "compound";

export interface ProcessedToken {
	original: string; // Original text: "i like chicken"
	normalized: string; // Core concept: "like chicken"
	keyPhrase: string; // Main entity: "chicken"
	type: TokenType; // "word" | "phrase" | "compound"
	language: Language; // "en" | "zh" | "ms" | "mixed"
	pos?: string; // Part of speech (optional)
	semanticWeight: number; // Importance score 0-1
}

// Chinese filler words (already defined but keeping for completeness)
const CHINESE_FILLERS = [
	"我",
	"你",
	"他",
	"她",
	"它",
	"们",
	"的",
	"地",
	"得",
	"很",
	"非常",
	"特别",
	"挺",
	"好",
	"真",
	"喜欢",
	"爱",
	"想",
	"要",
	"觉得",
	"是",
	"在",
	"有",
	"了",
	"也",
	"都",
	"还",
	"就",
	"这",
	"那",
	"哪",
];

// English filler words
const ENGLISH_FILLERS = [
	"i",
	"me",
	"my",
	"you",
	"your",
	"he",
	"she",
	"it",
	"we",
	"our",
	"they",
	"the",
	"a",
	"an",
	"is",
	"are",
	"was",
	"were",
	"be",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"and",
	"or",
	"but",
	"in",
	"on",
	"at",
	"to",
	"for",
	"of",
	"with",
	"like",
	"love",
	"want",
	"very",
	"so",
	"this",
	"that",
];

// Malay filler words
const MALAY_FILLERS = [
	"saya",
	"aku",
	"kamu",
	"dia",
	"mereka",
	"yang",
	"adalah",
	"ialah",
	"suka",
	"cinta",
	"mahu",
	"nak",
	"sangat",
	"sekali",
	"amat",
	"di",
	"ke",
	"dari",
	"untuk",
	"dan",
	"atau",
	"tetapi",
	"ini",
	"itu",
];

// Jieba instance (lazy-loaded)
let jiebaInstance: any = null;
let jiebaInitialized = false;

/**
 * Initialize jieba-wasm (call once, browser-side)
 */
async function initJieba(): Promise<void> {
	if (jiebaInitialized) return;

	try {
		jiebaInstance = await jiebaInit();
		jiebaInitialized = true;
		console.log("[NLP] Jieba WASM initialized successfully");
	} catch (error) {
		console.error("[NLP] Failed to initialize Jieba:", error);
		jiebaInitialized = false;
	}
}

/**
 * Detect language using franc library + fallback character analysis
 */
export function detectLanguage(text: string): Language {
	if (!text || text.trim().length === 0) return "en";

	// Use franc for statistical language detection
	try {
		const detected = franc(text, { only: ["cmn", "eng", "zsm", "zlm"] });
		const mapped = LANG_CODES[detected as keyof typeof LANG_CODES];
		if (mapped) {
			// Check for mixed content
			const hasChinese = /[\u4e00-\u9fff]/.test(text);
			const hasLatin = /[a-zA-Z]/.test(text);
			if (hasChinese && hasLatin) return "mixed";
			return mapped;
		}
	} catch (e) {
		// Franc failed, use fallback
	}

	// Fallback: character-based detection
	const hasChinese = /[\u4e00-\u9fff]/.test(text);
	const hasLatin = /[a-zA-Z]/.test(text);
	const malayKeywords = ["saya", "aku", "yang", "adalah", "ke", "dari"];
	const hasMalayKeywords = malayKeywords.some((kw) =>
		text.toLowerCase().includes(kw)
	);

	if (hasChinese && hasLatin) return "mixed";
	if (hasChinese) return "zh";
	if (hasMalayKeywords) return "ms";
	return "en";
}

/**
 * Process Chinese text using jieba-wasm
 */
async function processChinese(text: string): Promise<ProcessedToken> {
	await initJieba();

	if (!jiebaInstance) {
		// Fallback if jieba fails to load
		return {
			original: text,
			normalized: text,
			keyPhrase: text,
			type: "word",
			language: "zh",
			semanticWeight: 1.0,
		};
	}

	try {
		// Segment using jieba (precise mode)
		const segments: string[] = jiebaInstance.cut(text, false);

		// Filter out filler words
		const filtered = segments.filter(
			(seg: string) => !CHINESE_FILLERS.includes(seg) && seg.trim().length > 0
		);

		if (filtered.length === 0) {
			return {
				original: text,
				normalized: text,
				keyPhrase: text,
				type: "word",
				language: "zh",
				semanticWeight: 0.5, // Low weight for filler-only text
			};
		}

		// Extract key phrase (longest meaningful segment or last noun)
		const sortedByLength = [...filtered].sort((a, b) => b.length - a.length);
		const keyPhrase = sortedByLength[0];

		// Normalized form: join filtered segments
		const normalized = filtered.join(""); // Or with space: filtered.join(' ')

		return {
			original: text,
			normalized,
			keyPhrase,
			type: filtered.length > 1 ? "phrase" : "word",
			language: "zh",
			semanticWeight: 1.0,
		};
	} catch (error) {
		console.error("[NLP] Jieba processing error:", error);
		return {
			original: text,
			normalized: text,
			keyPhrase: text,
			type: "word",
			language: "zh",
			semanticWeight: 1.0,
		};
	}
}

/**
 * Process English text using compromise
 */
function processEnglish(text: string): ProcessedToken {
	try {
		const doc = nlp(text);

		// Extract nouns and verbs
		const nouns = doc.nouns().text();
		const verbPhrases = doc.match("#Verb #Noun").text();
		const nounPhrases = doc.match("#Adjective? #Noun+").text();

		// Determine key phrase (main noun or noun phrase)
		let keyPhrase = nouns || text.split(/\s+/).pop() || text;

		// Get normalized text (remove fillers)
		const words = text.toLowerCase().split(/\s+/);
		const filtered = words.filter((w) => !ENGLISH_FILLERS.includes(w));
		const normalized = filtered.join(" ") || text;

		// Determine if it's a phrase
		const isPhrase =
			verbPhrases.length > 0 ||
			nounPhrases.length > 0 ||
			filtered.length > 1;

		// Extract first noun as key phrase if available
		if (nouns) {
			const nounWords = nouns.split(/\s+/);
			keyPhrase = nounWords[nounWords.length - 1]; // Last noun is usually key
		}

		return {
			original: text,
			normalized,
			keyPhrase,
			type: isPhrase ? "phrase" : "word",
			language: "en",
			pos: doc.json()[0]?.terms?.[0]?.tags?.[0],
			semanticWeight: 1.0,
		};
	} catch (error) {
		console.error("[NLP] Compromise processing error:", error);
		return {
			original: text,
			normalized: text.toLowerCase(),
			keyPhrase: text.toLowerCase(),
			type: "word",
			language: "en",
			semanticWeight: 1.0,
		};
	}
}

/**
 * Process Malay text (using custom rules + compromise)
 */
function processMalay(text: string): ProcessedToken {
	try {
		const words = text.toLowerCase().split(/\s+/);
		const filtered = words.filter((w) => !MALAY_FILLERS.includes(w));

		if (filtered.length === 0) {
			return {
				original: text,
				normalized: text,
				keyPhrase: text,
				type: "word",
				language: "ms",
				semanticWeight: 0.5,
			};
		}

		// Key phrase is typically the last word (main noun in Malay)
		const keyPhrase = filtered[filtered.length - 1];
		const normalized = filtered.join(" ");

		// Detect common Malay noun compounds
		const isCompound =
			/ayam goreng|nasi lemak|roti canai|teh tarik|makan malam/i.test(text);

		return {
			original: text,
			normalized,
			keyPhrase: isCompound ? normalized : keyPhrase,
			type: filtered.length > 1 || isCompound ? "phrase" : "word",
			language: "ms",
			semanticWeight: 1.0,
		};
	} catch (error) {
		console.error("[NLP] Malay processing error:", error);
		return {
			original: text,
			normalized: text.toLowerCase(),
			keyPhrase: text.toLowerCase(),
			type: "word",
			language: "ms",
			semanticWeight: 1.0,
		};
	}
}

/**
 * Process mixed language text
 */
async function processMixed(text: string): Promise<ProcessedToken> {
	// Try Chinese processing first (more specific)
	const zhResult = await processChinese(text);

	// Try English processing
	const enResult = processEnglish(text);

	// Pick the result with more meaningful content
	if (
		zhResult.normalized.length > enResult.normalized.length &&
		zhResult.normalized !== text
	) {
		return { ...zhResult, language: "mixed" };
	}

	return { ...enResult, language: "mixed" };
}

/**
 * Main entry point: Process text in any language
 */
export async function processMultilingual(
	text: string
): Promise<ProcessedToken> {
	if (!text || text.trim().length === 0) {
		return {
			original: text,
			normalized: "",
			keyPhrase: "",
			type: "word",
			language: "en",
			semanticWeight: 0,
		};
	}

	const trimmedText = text.trim();
	const language = detectLanguage(trimmedText);

	switch (language) {
		case "zh":
			return await processChinese(trimmedText);
		case "en":
			return processEnglish(trimmedText);
		case "ms":
			return processMalay(trimmedText);
		case "mixed":
			return await processMixed(trimmedText);
		default:
			// Fallback to English
			return processEnglish(trimmedText);
	}
}

/**
 * Batch process multiple texts (with progress tracking)
 */
export async function processBatch(
	texts: string[],
	onProgress?: (processed: number, total: number) => void
): Promise<ProcessedToken[]> {
	const results: ProcessedToken[] = [];

	for (let i = 0; i < texts.length; i++) {
		const token = await processMultilingual(texts[i]);
		results.push(token);

		if (onProgress) {
			onProgress(i + 1, texts.length);
		}
	}

	return results;
}
