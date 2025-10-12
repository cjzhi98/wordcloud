// Word Cloud Processor: Complete pipeline from entries to display-ready groups
// Spam filtering, NLP processing, semantic grouping, quality scoring

import type { Entry } from "../types";
import {
	processMultilingual,
	type ProcessedToken,
} from "./multilingualNLP";
import {
	groupSemantically,
	createIndividualGroups,
	filterByMinOccurrence,
	limitByDisplayMode,
	type SemanticGroup,
} from "./semanticGrouping";

export interface ProcessorOptions {
	displayMode: "overview" | "balanced" | "detailed";
	showPhrases: boolean; // If false, only show key phrases
	minOccurrence: number; // Minimum count to display
	enableSpamFilter: boolean;
	semanticGrouping: boolean; // Group similar phrases?
}

export const DEFAULT_OPTIONS: ProcessorOptions = {
	displayMode: "balanced",
	showPhrases: true,
	minOccurrence: 2,
	enableSpamFilter: true,
	semanticGrouping: true,
};

/**
 * Whitelist of legitimate short words (2-3 characters)
 * Words NOT in this list are considered spam if they're short Latin text
 */
const LEGITIMATE_SHORT_WORDS = new Set([
	// English common words
	"am",
	"is",
	"are",
	"was",
	"be",
	"do",
	"can",
	"hi",
	"hey",
	"bye",
	"yes",
	"no",
	"ok",
	"omg",
	"lol",
	"you",
	"me",
	"we",
	"us",
	"my",
	"our",
	"the",
	"and",
	"but",
	"for",
	"not",
	"all",
	"any",
	"get",
	"got",
	"had",
	"has",
	"how",
	"why",
	"who",
	"wow",
	"yay",
	"go",
	"let",
	"new",
	"old",
	"big",
	"see",
	"say",
	"too",
	"way",
	"eat",
	"buy",
	"up",
	"out",
	"now",
	"day",
	"use",
	"her",
	"his",
	"she",
	"him",
	"its",
	"may",
	"try",
	"ask",
	"own",
	"put",
	"off",
	"run",
	"top",
	"hot",
	"cut",
	"yet",
	"lot",
	"set",
	"far",
	"act",
	"end",
	"age",
	"bad",
	"add",
	"arm",
	"art",
	"bag",
	"bed",
	"boy",
	"box",
	"bus",
	"car",
	"cat",
	"cup",
	"dog",
	"eye",
	"fun",
	"guy",
	"hit",
	"job",
	"kid",
	"law",
	"leg",
	"lie",
	"man",
	"map",
	"mom",
	"dad",
	"pay",
	"red",
	"sea",
	"sit",
	"six",
	"son",
	"sun",
	"ten",
	"war",
	"win",
	"air",
	"oil",
	// Malay common words
	"saya",
	"apa",
	"ada",
	"tak",
	"nak",
	"ini",
	"itu",
	"dan",
	"ya",
	"dia",
	"tau",
	// Food/common nouns
	"tea",
	"pie",
	// Time/numbers
	"one",
	"two",
]);

/**
 * Detect spam/gibberish text
 * Enhanced with whitelist approach for maximum spam filtering
 */
export function isSpam(text: string): boolean {
	if (!text || text.trim().length === 0) return true;

	const cleaned = text.trim().toLowerCase();

	// Allow ALL CJK characters (Chinese, Japanese, Korean) regardless of length
	if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(cleaned)) {
		return false;
	}

	// WHITELIST APPROACH: Short Latin words (≤3 chars) must be in whitelist
	if (cleaned.length <= 3 && /^[a-z]+$/i.test(cleaned)) {
		if (!LEGITIMATE_SHORT_WORDS.has(cleaned)) {
			return true; // Not in whitelist = spam
		}
	}

	// Repeated characters: "aaaa", "ewqewqewq"
	if (/(.)\1{3,}/.test(cleaned)) {
		return true;
	}

	// Alternating 2 character patterns: "yaya", "asas", "dodo"
	if (/^([a-z]{2})\1+$/i.test(cleaned)) {
		return true;
	}

	// Alternating 2-3 character patterns (keyboard mashing): "asdasd", "qweqwe"
	if (/^([a-z]{2,3})\1{2,}$/i.test(cleaned)) {
		return true;
	}

	// Keyboard row sequences: "asd", "sdf", "dfg", "jkl", "qwe", "ewq", "zxc"
	const keyboardSequences = [
		"asd",
		"sdf",
		"dfg",
		"fgh",
		"ghj",
		"hjk",
		"jkl",
		"qwe",
		"wer",
		"ert",
		"rty",
		"tyu",
		"yui",
		"uio",
		"iop",
		"zxc",
		"xcv",
		"cvb",
		"vbn",
		"bnm",
		// Reverse sequences
		"dsa",
		"fds",
		"gfd",
		"hgf",
		"jhg",
		"kjh",
		"lkj",
		"ewq",
		"rew",
		"tre",
		"ytr",
		"uyt",
		"iuy",
		"oiu",
		"poi",
		"cxz",
		"vcx",
		"bvc",
		"nbv",
		"mnb",
	];

	if (keyboardSequences.some((seq) => cleaned.includes(seq))) {
		return true;
	}

	// Mixed alphanumeric gibberish: "ewq3eqwqw", "abc123abc"
	if (/[0-9]/.test(cleaned) && cleaned.length > 3) {
		// Has numbers - check if it's gibberish pattern
		if (/^[a-z0-9]{4,}$/i.test(cleaned) && !/^[0-9]+$/.test(cleaned)) {
			// Mixed letters and numbers, likely spam unless it's a common pattern
			const legitPatterns = /covid|2023|2024|2025|iphone|macbook/i;
			if (!legitPatterns.test(cleaned)) {
				return true;
			}
		}
	}

	// Latin text with no vowels (likely gibberish) - more aggressive
	if (/^[a-z]{3,}$/i.test(cleaned) && !/[aeiou]/i.test(cleaned)) {
		// Exceptions: common acronyms, abbreviations
		const exceptions = [
			"www",
			"http",
			"ftp",
			"sql",
			"xml",
			"html",
			"css",
			"js",
			"php",
			"pdf",
			"gym",
		];
		if (!exceptions.includes(cleaned)) {
			return true;
		}
	}

	// Common gibberish patterns (expanded list)
	const gibberishPatterns = [
		"qweqwe",
		"asdasd",
		"zxczxc",
		"ewqewq",
		"dsadsa",
		"dsdas",
		"cxzcxz",
		"qwerty",
		"asdfgh",
		"zxcvbn",
		"asdqwe",
		"qweasd",
		"isdas",
		"yoyuo",
	];

	if (gibberishPatterns.some((pattern) => cleaned.includes(pattern))) {
		return true;
	}

	// Excessive consecutive consonants (> 5)
	if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(cleaned)) {
		return true;
	}

	// Very long words without spaces (likely keyboard mashing)
	if (cleaned.length > 20 && !/[\s\u4e00-\u9fff]/.test(cleaned)) {
		return true;
	}

	return false;
}

// Removed unused _calculateQualityScore function
// Can be added back for future quality-based filtering

/**
 * Process entries into display-ready semantic groups
 */
export async function processWordCloudData(
	entries: Entry[],
	options: Partial<ProcessorOptions> = {}
): Promise<SemanticGroup[]> {
	// Merge with defaults
	const opts: ProcessorOptions = { ...DEFAULT_OPTIONS, ...options };

	if (entries.length === 0) return [];

	console.log(`[Processor] Processing ${entries.length} entries...`);

	// Step 1: Extract unique texts to process
	const uniqueTexts = new Set<string>();
	entries.forEach((entry) => {
		if (entry.text && entry.text.trim().length > 0) {
			uniqueTexts.add(entry.text.trim());
		}
	});

	console.log(`[Processor] ${uniqueTexts.size} unique texts found`);

	// Step 2: Spam filtering (optional)
	let textsToProcess = Array.from(uniqueTexts);
	if (opts.enableSpamFilter) {
		textsToProcess = textsToProcess.filter((text) => !isSpam(text));
	}

	if (textsToProcess.length === 0) return [];

	// Step 3: NLP processing
	console.log("[Processor] Running NLP processing...");
	const tokens: ProcessedToken[] = [];

	for (const text of textsToProcess) {
		try {
			const token = await processMultilingual(text);
			if (token.normalized && token.normalized.length > 0) {
				tokens.push(token);
			}
		} catch (error) {
			console.error(`[Processor] Error processing "${text}":`, error);
		}
	}

	console.log(`[Processor] Processed ${tokens.length} tokens`);

	if (tokens.length === 0) return [];

	// Step 4: Semantic grouping or individual groups
	let groups: SemanticGroup[];
	if (opts.semanticGrouping) {
		console.log("[Processor] Applying semantic grouping...");
		groups = groupSemantically(tokens, entries);
	} else {
		console.log("[Processor] Creating individual groups...");
		groups = createIndividualGroups(tokens, entries);
	}

	console.log(`[Processor] Created ${groups.length} groups`);

	// Step 5: Filter by minimum occurrence
	if (opts.minOccurrence > 1) {
		groups = filterByMinOccurrence(groups, opts.minOccurrence);
		console.log(
			`[Processor] Filtered to ${groups.length} groups (min occurrence: ${opts.minOccurrence})`
		);
	}

	// Step 6: Apply display mode limits
	groups = limitByDisplayMode(groups, opts.displayMode);
	console.log(
		`[Processor] Limited to ${groups.length} groups for ${opts.displayMode} mode`
	);

	// Step 7: Final sorting by tier and count
	groups.sort((a, b) => {
		const tierOrder = { S: 0, A: 1, B: 2, C: 3 };
		if (tierOrder[a.tier] !== tierOrder[b.tier]) {
			return tierOrder[a.tier] - tierOrder[b.tier];
		}
		return b.totalCount - a.totalCount;
	});

	console.log(`[Processor] Processing complete!`);
	return groups;
}

/**
 * Get processing statistics
 */
export interface ProcessingStats {
	totalEntries: number;
	uniqueTexts: number;
	spamFiltered: number;
	groupsCreated: number;
	displayedGroups: number;
	languages: Record<string, number>;
	tierDistribution: Record<string, number>;
}

export async function getProcessingStats(
	entries: Entry[],
	options: Partial<ProcessorOptions> = {}
): Promise<ProcessingStats> {
	const groups = await processWordCloudData(entries, options);

	// Count languages
	const languages: Record<string, number> = {};
	groups.forEach((group) => {
		group.languages.forEach((lang) => {
			languages[lang] = (languages[lang] || 0) + 1;
		});
	});

	// Count tiers
	const tierDistribution: Record<string, number> = {
		S: 0,
		A: 0,
		B: 0,
		C: 0,
	};
	groups.forEach((group) => {
		tierDistribution[group.tier]++;
	});

	const uniqueTexts = new Set(entries.map((e) => e.text.trim())).size;
	const spamFiltered = options.enableSpamFilter
		? Array.from(new Set(entries.map((e) => e.text.trim()))).filter(
				(t) => isSpam(t)
		  ).length
		: 0;

	return {
		totalEntries: entries.length,
		uniqueTexts,
		spamFiltered,
		groupsCreated: groups.length,
		displayedGroups: groups.length,
		languages,
		tierDistribution,
	};
}
