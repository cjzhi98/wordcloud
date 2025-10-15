// Client-side text normalization for multilingual phrases (Chinese, English, Malay)
// Now using advanced multilingualNLP engine with jieba-wasm for Chinese

import { processMultilingual } from "./multilingualNLP";
// External name generators (with graceful fallback)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as UUG from "unique-username-generator";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {
	uniqueNamesGenerator,
	adjectives,
	animals,
} from "unique-names-generator";

/**
 * Normalize text using the new multilingual NLP engine
 * This is a wrapper for backward compatibility
 * @param text - Input text to normalize
 * @returns Normalized text
 *
 * UPDATED: Minimal filtering - only basic cleanup, no filler word removal
 */
export function normalizeText(text: string): string {
	if (!text || typeof text !== "string") {
		return "";
	}

	// Step 1: Basic cleanup only
	let normalized = text.trim().toLowerCase();

	// Remove punctuation for all languages
	normalized = normalized.replace(
		/[.,!?;:。,!?;:""''「」『』【】()（）]/g,
		" "
	);

	// Normalize whitespace
	normalized = normalized.replace(/\s+/g, " ").trim();

	// Return the cleaned text without filtering filler words
	return normalized || text.trim().toLowerCase();
}

/**
 * Async version of normalizeText using the advanced NLP engine
 * Use this for better Chinese, English, and Malay processing
 * @param text - Input text to normalize
 * @returns Promise<string> Normalized text
 */
export async function normalizeTextAsync(text: string): Promise<string> {
	if (!text || typeof text !== "string") {
		return "";
	}

	try {
		const token = await processMultilingual(text);
		return token.normalized || text.trim().toLowerCase();
	} catch (error) {
		console.error("[normalizeTextAsync] Error:", error);
		// Fallback to synchronous version
		return normalizeText(text);
	}
}

export function generateCuteNickname(): string {
	try {
		const anyUUG: any = UUG as any;
		if (anyUUG && typeof anyUUG.generateUsername === "function") {
			// Many versions accept (separator, length)
			const val = anyUUG.generateUsername(" ", 2);
			if (typeof val === "string") return toTitleCase(val);
		}
		// Some versions expose default export
		if (typeof (anyUUG as any) === "function") {
			const val = (anyUUG as any)(" ", 2);
			if (typeof val === "string") return toTitleCase(val);
		}
	} catch (_) {
		// ignore and fallback
	}

	// Fallback to unique-names-generator
	try {
		const name = uniqueNamesGenerator({
			dictionaries: [adjectives, animals],
			separator: " ",
			style: "lowerCase",
			length: 2,
		});
		return toTitleCase(name);
	} catch (_) {
		// Final deterministic fallback
		const fallback = ["Joyful", "Radiant", "Gentle", "Brave", "Kind"];
		const animalsList = ["Panda", "Eagle", "Star", "Light", "Cloud"];
		const a = fallback[Math.floor(Math.random() * fallback.length)];
		const n = animalsList[Math.floor(Math.random() * animalsList.length)];
		return `${a} ${n}`;
	}
}

function toTitleCase(s: string) {
	return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
