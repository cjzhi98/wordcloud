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

// REMOVED: LEGITIMATE_SHORT_WORDS whitelist - no longer used since we removed aggressive filtering

/**
 * Detect spam/gibberish text
 * UPDATED: Minimal spam detection - only catch extreme cases
 */
export function isSpam(text: string): boolean {
	if (!text || text.trim().length === 0) return true;

	const cleaned = text.trim().toLowerCase();

	// Allow ALL CJK characters (Chinese, Japanese, Korean) regardless of length
	if (/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(cleaned)) {
		return false;
	}

	// REMOVED: Aggressive whitelist check for short words
	// This was filtering out valid short words like "zha", "ji", "da", etc.

	// Repeated characters: "aaaa", "eeee" (4+ same character)
	if (/(.)\1{4,}/.test(cleaned)) {
		return true;
	}

	// Alternating 2 character patterns: "yaya", "asas", "dodo" (repeated 3+ times)
	if (/^([a-z]{2})\1{3,}$/i.test(cleaned)) {
		return true;
	}

	// Only catch obvious keyboard mashing patterns (repeated 4+ times)
	if (/^([a-z]{2,3})\1{4,}$/i.test(cleaned)) {
		return true;
	}

	// Only block full keyboard row sequences, not partial ones
	const obviousKeyboardMashing = [
		"qwertyuiop",
		"asdfghjkl",
		"zxcvbnm",
		"qwerty",
		"asdfgh",
		"zxcvbn",
		"poiuytrewq",
		"lkjhgfdsa",
		"mnbvcxz",
	];

	if (obviousKeyboardMashing.some((seq) => cleaned.includes(seq))) {
		return true;
	}

	// REMOVED: Mixed alphanumeric gibberish check (too aggressive)
	// REMOVED: No vowels check (too aggressive, blocks valid words)
	// REMOVED: Common gibberish patterns check (too aggressive)
	// REMOVED: Excessive consonants check (too aggressive)

	// Only block extremely long single words (likely actual keyboard mashing)
	if (cleaned.length > 30 && !/[\s\u4e00-\u9fff]/.test(cleaned)) {
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
		groups = groupSemantically(tokens, entries, {
			showPhrases: opts.showPhrases,
		});
	} else {
		console.log("[Processor] Creating individual groups...");
		groups = createIndividualGroups(tokens, entries, {
			showPhrases: opts.showPhrases,
		});
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
