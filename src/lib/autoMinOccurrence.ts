// Auto Min Occurrence: Intelligent threshold calculation for word cloud display
// Adapts based on data diversity, size, and quality

import type { Entry } from "../types";

export interface AutoMinOccurrenceOptions {
	preferredWordCount?: number; // Target number of words to display (default: 50)
	spamSensitivity?: "low" | "medium" | "high"; // How aggressive to filter (default: medium)
}

export interface DataAnalysis {
	totalEntries: number;
	uniqueWords: number;
	diversity: number; // 0-1 (1 = all unique)
	maxFrequency: number;
	avgFrequency: number;
	medianFrequency: number;
	spamRatio: number;
	dominanceRatio: number; // % of top word
}

/**
 * Count word frequencies from entries
 */
function getFrequencyDistribution(entries: Entry[]): number[] {
	const countMap = new Map<string, number>();

	entries.forEach((entry) => {
		const key = entry.normalized_text || entry.text.toLowerCase();
		countMap.set(key, (countMap.get(key) || 0) + 1);
	});

	return Array.from(countMap.values()).sort((a, b) => b - a);
}

/**
 * Calculate median of an array
 */
function calculateMedian(values: number[]): number {
	if (values.length === 0) return 0;

	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2;
	}
	return sorted[mid];
}

/**
 * Estimate spam ratio (basic heuristic)
 */
function estimateSpamRatio(entries: Entry[]): number {
	// Simple patterns to detect likely spam
	const isLikelySpam = (text: string): boolean => {
		const lower = text.toLowerCase().trim();

		// Too short
		if (lower.length < 2 && !/[\u4e00-\u9fff]/.test(lower)) return true;

		// Repeated chars
		if (/(.)\1{3,}/.test(lower)) return true;

		// Repeated short patterns
		if (/^([a-z]{1,2})\1{2,}$/i.test(lower)) return true;

		// No vowels (English)
		if (/^[a-z]{3,}$/i.test(lower) && !/[aeiou]/i.test(lower)) return true;

		return false;
	};

	const spamCount = entries.filter((e) => isLikelySpam(e.text)).length;
	return spamCount / Math.max(entries.length, 1);
}

/**
 * Count how many words would be visible with given threshold
 */
function countWordsAboveThreshold(
	frequencies: number[],
	threshold: number
): number {
	return frequencies.filter((f) => f >= threshold).length;
}

/**
 * Analyze data characteristics
 */
export function analyzeData(entries: Entry[]): DataAnalysis {
	if (entries.length === 0) {
		return {
			totalEntries: 0,
			uniqueWords: 0,
			diversity: 0,
			maxFrequency: 0,
			avgFrequency: 0,
			medianFrequency: 0,
			spamRatio: 0,
			dominanceRatio: 0,
		};
	}

	const frequencies = getFrequencyDistribution(entries);
	const uniqueWords = frequencies.length;
	const totalEntries = entries.length;

	return {
		totalEntries,
		uniqueWords,
		diversity: uniqueWords / totalEntries,
		maxFrequency: frequencies[0] || 0,
		avgFrequency: totalEntries / uniqueWords,
		medianFrequency: calculateMedian(frequencies),
		spamRatio: estimateSpamRatio(entries),
		dominanceRatio: (frequencies[0] || 0) / totalEntries,
	};
}

/**
 * Calculate optimal minimum occurrence threshold
 * Returns a number between 1 and 10
 */
export function calculateAutoMinOccurrence(
	entries: Entry[],
	options: AutoMinOccurrenceOptions = {}
): number {
	const { preferredWordCount = 50, spamSensitivity = "medium" } = options;

	// Handle edge cases
	if (entries.length === 0) return 1;
	if (entries.length < 10) return 1; // Too small, show all

	// Analyze data
	const analysis = analyzeData(entries);
	const {
		totalEntries,
		diversity,
		maxFrequency,
		medianFrequency,
		spamRatio,
		dominanceRatio,
	} = analysis;

	let threshold = 1;

	// SAFETY CHECK: Never show everything if spam is present
	// Minimum baseline threshold when spam detected
	if (spamRatio > 0.2) {
		threshold = 2; // Start with minimum of 2
	}

	// CASE 1: High diversity (most words unique)
	// Show almost everything - people are being creative
	// BUT: Only if spam ratio is low
	if (diversity >= 0.8 && spamRatio < 0.15) {
		return Math.max(threshold, 1);
	}

	// CASE 2: Single word dominates (>40% of total)
	// Filter aggressively to show meaningful alternatives
	if (dominanceRatio > 0.4) {
		threshold = Math.ceil(maxFrequency * 0.15); // Top 15% threshold
		return Math.max(2, Math.min(threshold, 10));
	}

	// CASE 3: Very low diversity (<0.3) with moderate dominance
	// Multiple words repeated many times
	if (diversity < 0.3) {
		if (dominanceRatio > 0.25) {
			// Strong clustering around top words
			threshold = Math.ceil(maxFrequency * 0.2); // Top 20%
		} else {
			// Spread repeats
			threshold = Math.max(2, Math.ceil(medianFrequency));
		}
	}
	// CASE 4: Medium diversity (0.3-0.8)
	// Standard case - use median as baseline
	else {
		threshold = Math.ceil(medianFrequency);
	}

	// ADJUSTMENT 1: Scale with dataset size
	if (totalEntries > 500) {
		threshold += 2; // Large dataset, filter more
	} else if (totalEntries > 200) {
		threshold += 1;
	} else if (totalEntries < 50) {
		threshold = Math.max(1, threshold - 1); // Small dataset, show more
	}

	// ADJUSTMENT 2: Spam sensitivity
	const spamAdjustments = {
		low: 0,
		medium: spamRatio > 0.15 ? 1 : 0, // More aggressive trigger (was 0.2)
		high: spamRatio > 0.1 ? 2 : spamRatio > 0.25 ? 3 : 0,
	};
	threshold += spamAdjustments[spamSensitivity];

	// ADJUSTMENT 3: Iterative refinement to hit target word count
	const frequencies = getFrequencyDistribution(entries);
	let estimatedVisible = countWordsAboveThreshold(frequencies, threshold);

	// If too many words, increase threshold
	if (estimatedVisible > preferredWordCount * 1.5) {
		threshold += 1;
		estimatedVisible = countWordsAboveThreshold(frequencies, threshold);

		// Try once more if still too many
		if (estimatedVisible > preferredWordCount * 1.8) {
			threshold += 1;
		}
	}
	// If too few words, decrease threshold
	else if (estimatedVisible < preferredWordCount * 0.5 && threshold > 1) {
		threshold = Math.max(1, threshold - 1);
	}

	// Final bounds check
	threshold = Math.max(1, Math.min(threshold, 10));

	// FINAL SAFETY: Never return 1 if significant spam present
	if (threshold === 1 && spamRatio > 0.2) {
		threshold = 2;
	}

	return threshold;
}

/**
 * Get human-readable explanation for the calculated threshold
 */
export function explainThreshold(
	entries: Entry[],
	threshold: number
): string {
	if (entries.length === 0) return "No data to analyze";

	const analysis = analyzeData(entries);
	const { diversity, spamRatio, dominanceRatio, totalEntries } = analysis;

	const reasons: string[] = [];

	if (diversity > 0.8) {
		reasons.push("high diversity (most words unique)");
	} else if (diversity < 0.3) {
		reasons.push("low diversity (many repeats)");
	}

	if (dominanceRatio > 0.4) {
		reasons.push("one word dominates");
	}

	if (spamRatio > 0.3) {
		reasons.push("high spam ratio");
	} else if (spamRatio > 0.15) {
		reasons.push("moderate spam detected");
	}

	if (totalEntries > 500) {
		reasons.push("large dataset");
	} else if (totalEntries < 50) {
		reasons.push("small dataset");
	}

	if (reasons.length === 0) {
		return `Threshold ${threshold} based on normal data distribution`;
	}

	return `Threshold ${threshold} due to: ${reasons.join(", ")}`;
}
