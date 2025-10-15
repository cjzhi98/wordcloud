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

// REMOVED: Filler word arrays - no longer used since we keep all words

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
 * UPDATED: Keeps all words including filler words
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

		// UPDATED: Keep ALL segments, don't filter filler words
		const filtered = segments.filter((seg: string) => seg.trim().length > 0);

		if (filtered.length === 0) {
			return {
				original: text,
				normalized: text,
				keyPhrase: text,
				type: "word",
				language: "zh",
				semanticWeight: 1.0,
			};
		}

		// Extract key phrase (longest segment)
		const sortedByLength = [...filtered].sort((a, b) => b.length - a.length);
		const keyPhrase = sortedByLength[0];

		// Normalized form: join all segments
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
 * UPDATED: Keeps all words including filler words
 */
function processEnglish(text: string): ProcessedToken {
	try {
		const doc = nlp(text);

		// Extract nouns and verbs
		const nounDoc = doc.nouns();
		const nounEntries = nounDoc.json();
		const verbPhrases = doc.match("#Verb #Noun").text();
		const nounPhrases = doc.match("#Adjective? #Noun+").text();

		const normalized = text.toLowerCase().trim();
		const words = normalized.length > 0 ? normalized.split(/\s+/) : [];

		const pronouns = new Set([
			"i",
			"me",
			"you",
			"we",
			"us",
			"they",
			"them",
			"he",
			"him",
			"she",
			"her",
			"it",
			"ya",
			"u",
		]);

		const questionStarters = new Set([
			"what",
			"whats",
			"why",
			"how",
			"who",
			"whos",
			"where",
			"wheres",
			"when",
			"whens",
		]);

		// Build list of noun candidates, preserving order and removing pronouns
		const nounCandidates: string[] = [];
		nounEntries.forEach((entry: any) => {
			entry.terms?.forEach((term: any) => {
				const termText = term?.text?.toLowerCase?.();
				const tags: string[] = term?.tags ?? [];
				if (!termText) return;
				if (tags.includes("Pronoun")) return;
				if (
					tags.includes("Noun") ||
					tags.includes("Singular") ||
					tags.includes("Plural") ||
					tags.includes("NounPhrase")
				) {
					nounCandidates.push(termText);
				}
			});
		});

		let keyPhrase =
			nounCandidates.length > 0
				? nounCandidates[nounCandidates.length - 1]
				: words[words.length - 1] || normalized;

		// Determine if it's a phrase
		const isPhrase =
			verbPhrases.length > 0 ||
			nounPhrases.length > 0 ||
			words.length > 1;

		// Question-style sentences: keep the whole phrase
		if (words.length > 0) {
			const firstWord = words[0];
			const starter = firstWord.replace(/[^a-z]/g, "");
			if (questionStarters.has(starter) || normalized.endsWith("?")) {
				keyPhrase = normalized;
			}
		}

		// Avoid pronoun-only key phrases
		if (pronouns.has(keyPhrase)) {
			const fallback = [...nounCandidates]
				.reverse()
				.find((candidate) => !pronouns.has(candidate));
			if (fallback) {
				keyPhrase = fallback;
			} else if (words.length > 1) {
				keyPhrase = normalized;
			}
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
 * UPDATED: Keeps all words including filler words
 */
function processMalay(text: string): ProcessedToken {
	try {
		const words = text.toLowerCase().split(/\s+/);

		// UPDATED: Keep ALL words, don't filter fillers
		const normalized = text.toLowerCase();

		// Key phrase is typically the last word (main noun in Malay)
		const keyPhrase = words[words.length - 1];

		// Detect common Malay noun compounds
		const isCompound =
			/ayam goreng|nasi lemak|roti canai|teh tarik|makan malam/i.test(text);

		return {
			original: text,
			normalized,
			keyPhrase: isCompound ? normalized : keyPhrase,
			type: words.length > 1 || isCompound ? "phrase" : "word",
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
