// Semantic Grouping: Cluster similar words and phrases intelligently
// Groups by key entities (e.g., all "chicken" phrases together)

import type { ProcessedToken, Language } from "./multilingualNLP";
import type { Entry } from "../types";

export type Tier = "S" | "A" | "B" | "C";

export interface SemanticVariant {
	text: string; // Original text
	normalized: string; // Normalized form
	count: number; // Number of occurrences
	language: Language;
}

export interface SemanticGroup {
	canonical: string; // "chicken"
	displayText: string; // "chicken" or best variant
	keyPhrase: string; // "chicken"
	variants: SemanticVariant[]; // All phrases with this key
	totalCount: number; // Sum of all variant counts
	tier: Tier; // S/A/B/C for sizing
	semanticScore: number; // Importance score
	languages: Set<Language>; // Languages present
	colors: string[]; // Colors from entries
}

/**
 * Count occurrences of each entry
 */
function buildCountMap(entries: Entry[]): Map<string, number> {
	const countMap = new Map<string, number>();

	entries.forEach((entry) => {
		const key = entry.normalized_text || entry.text.toLowerCase();
		countMap.set(key, (countMap.get(key) || 0) + 1);
	});

	return countMap;
}

/**
 * Group tokens by their key phrase (semantic clustering)
 */
function clusterByKeyPhrase(
	tokens: ProcessedToken[],
	countMap: Map<string, number>,
	entries: Entry[]
): Map<string, SemanticGroup> {
	const groups = new Map<string, SemanticGroup>();

	// Build a map of normalized text to entry for color extraction
	const textToEntry = new Map<string, Entry>();
	entries.forEach((entry) => {
		const key = entry.normalized_text || entry.text.toLowerCase();
		if (!textToEntry.has(key)) {
			textToEntry.set(key, entry);
		}
	});

	tokens.forEach((token) => {
		// Use keyPhrase as the clustering key (lowercased for consistency)
		const groupKey = token.keyPhrase.toLowerCase();

		if (!groups.has(groupKey)) {
			groups.set(groupKey, {
				canonical: groupKey,
				displayText: token.keyPhrase, // Will be updated later
				keyPhrase: token.keyPhrase,
				variants: [],
				totalCount: 0,
				tier: "C", // Default tier
				semanticScore: 0,
				languages: new Set<Language>(),
				colors: [],
			});
		}

		const group = groups.get(groupKey)!;
		const normalizedKey = token.normalized.toLowerCase();
		const count = countMap.get(normalizedKey) || 1;

		// Check if this variant already exists
		const existingVariant = group.variants.find(
			(v) => v.normalized === normalizedKey
		);

		if (existingVariant) {
			existingVariant.count += count;
		} else {
			group.variants.push({
				text: token.original,
				normalized: normalizedKey,
				count,
				language: token.language,
			});
		}

		group.totalCount += count;
		group.languages.add(token.language);

		// Add color from entry if available
		const entry = textToEntry.get(normalizedKey);
		if (entry && entry.color && !group.colors.includes(entry.color)) {
			group.colors.push(entry.color);
		}
	});

	return groups;
}

/**
 * Choose the best display text for a group
 * Prioritizes: most frequent, then most complete, then shortest
 */
function chooseBestDisplayText(group: SemanticGroup): string {
	if (group.variants.length === 0) return group.keyPhrase;

	// Sort by count (desc), then by length (prefer complete phrases)
	const sorted = [...group.variants].sort((a, b) => {
		if (b.count !== a.count) return b.count - a.count;
		return b.text.length - a.text.length;
	});

	// If top variant is a single word matching keyPhrase, use keyPhrase
	const topVariant = sorted[0];
	if (topVariant.text.toLowerCase() === group.keyPhrase.toLowerCase()) {
		return group.keyPhrase;
	}

	// If top variant is significantly more frequent, use it
	if (sorted.length > 1 && topVariant.count > sorted[1].count * 2) {
		return topVariant.text;
	}

	// Use keyPhrase for clarity
	return group.keyPhrase;
}

/**
 * Calculate semantic score (for ranking)
 * Higher score = more important
 */
function calculateSemanticScore(group: SemanticGroup): number {
	// Factors:
	// 1. Frequency (logarithmic to avoid dominance)
	// 2. Variant diversity (more variants = more interesting)
	// 3. Language diversity (multilingual = bonus)

	const frequencyScore = Math.log(group.totalCount + 1);
	const variantScore = Math.sqrt(group.variants.length);
	const languageBonus = group.languages.size > 1 ? 1.2 : 1.0;

	return frequencyScore * variantScore * languageBonus;
}

/**
 * Assign tiers based on cumulative frequency distribution
 */
function assignTiers(groups: SemanticGroup[]): SemanticGroup[] {
	// Sort by total count (descending)
	groups.sort((a, b) => b.totalCount - a.totalCount);

	const totalCount = groups.reduce((sum, g) => sum + g.totalCount, 0);
	let cumulativePercent = 0;

	return groups.map((group, index) => {
		const percent = (group.totalCount / totalCount) * 100;
		cumulativePercent += percent;

		// Tier S: Top ~5 items, covering 40-60% of frequency
		if (index < 5 && cumulativePercent <= 65) {
			group.tier = "S";
		}
		// Tier A: Next ~15 items, covering 20-30%
		else if (index < 20 && cumulativePercent <= 90) {
			group.tier = "A";
		}
		// Tier B: Next ~25 items
		else if (index < 50) {
			group.tier = "B";
		}
		// Tier C: Remaining items
		else {
			group.tier = "C";
		}

		return group;
	});
}

/**
 * Main entry point: Group tokens semantically
 */
export function groupSemantically(
	tokens: ProcessedToken[],
	entries: Entry[]
): SemanticGroup[] {
	if (tokens.length === 0) return [];

	// Step 1: Build count map
	const countMap = buildCountMap(entries);

	// Step 2: Cluster by key phrase
	const groupsMap = clusterByKeyPhrase(tokens, countMap, entries);

	// Step 3: Convert to array
	let groups = Array.from(groupsMap.values());

	// Step 4: Choose best display text for each group
	groups.forEach((group) => {
		group.displayText = chooseBestDisplayText(group);
		group.semanticScore = calculateSemanticScore(group);
	});

	// Step 5: Sort by semantic score
	groups.sort((a, b) => b.semanticScore - a.semanticScore);

	// Step 6: Assign tiers
	groups = assignTiers(groups);

	return groups;
}

/**
 * Create individual groups (no semantic clustering)
 * Each unique text becomes its own group
 */
export function createIndividualGroups(
	tokens: ProcessedToken[],
	entries: Entry[]
): SemanticGroup[] {
	const countMap = buildCountMap(entries);

	// Build a map of normalized text to entry for color extraction
	const textToEntry = new Map<string, Entry>();
	entries.forEach((entry) => {
		const key = entry.normalized_text || entry.text.toLowerCase();
		if (!textToEntry.has(key)) {
			textToEntry.set(key, entry);
		}
	});

	// Group by normalized text (no semantic clustering)
	const groupsMap = new Map<string, SemanticGroup>();

	tokens.forEach((token) => {
		const key = token.normalized.toLowerCase();

		if (!groupsMap.has(key)) {
			const count = countMap.get(key) || 1;
			const entry = textToEntry.get(key);

			groupsMap.set(key, {
				canonical: token.keyPhrase,
				displayText: token.original,
				keyPhrase: token.keyPhrase,
				variants: [
					{
						text: token.original,
						normalized: key,
						count,
						language: token.language,
					},
				],
				totalCount: count,
				tier: "C",
				semanticScore: Math.log(count + 1),
				languages: new Set([token.language]),
				colors: entry && entry.color ? [entry.color] : [],
			});
		}
	});

	// Convert to array and assign tiers
	const groupsArray = Array.from(groupsMap.values());
	return assignTiers(groupsArray);
}

/**
 * Filter groups by minimum occurrence threshold
 */
export function filterByMinOccurrence(
	groups: SemanticGroup[],
	minOccurrence: number
): SemanticGroup[] {
	return groups.filter((g) => g.totalCount >= minOccurrence);
}

/**
 * Limit groups by display mode
 */
export function limitByDisplayMode(
	groups: SemanticGroup[],
	mode: "overview" | "balanced" | "detailed"
): SemanticGroup[] {
	const limits = {
		overview: 30,
		balanced: 50,
		detailed: 100,
	};

	const maxItems = limits[mode];
	return groups.slice(0, maxItems);
}
