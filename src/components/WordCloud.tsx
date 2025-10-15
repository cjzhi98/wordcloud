import { useEffect, useState, useRef, useMemo } from 'react';
// d3-cloud handles pixel-perfect collision to prevent overlap
import cloud from 'd3-cloud';
import { motion, AnimatePresence } from 'framer-motion';
import type { Entry } from '../types';
import { processWordCloudData, type ProcessorOptions } from '../lib/wordCloudProcessor';
import type { SemanticGroup, SemanticVariant, Tier } from '../lib/semanticGrouping';
import type { Language } from '../lib/multilingualNLP';

interface WordCloudProps {
  entries: Entry[];
  containerWidth?: number;
  containerHeight?: number;
  maxWords?: number; // For backward compatibility (maps to display mode)
  rotationRangeDeg?: number;
  // New advanced props
  displayMode?: 'overview' | 'balanced' | 'detailed';
  showPhrases?: boolean;
  minOccurrence?: number;
  enableSpamFilter?: boolean;
  semanticGrouping?: boolean;
  onGroupsUpdate?: (groups: SemanticGroup[]) => void;
}

interface RenderWord {
  id: string;
  canonical: string;
  displayText: string;
  totalCount: number;
  tier: Tier;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  colors: string[];
  variants: SemanticVariant[];
  languages: Set<Language>;
  isVariant: boolean;
  parentCanonical?: string;
  parentDisplayText?: string;
}

// Deterministic pseudo-random generator so the same data yields the same layout.
const createSeededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const buildLayoutSeed = (groups: SemanticGroup[]) => {
  if (groups.length === 0) return 1;
  let hash = 0;
  for (const group of groups) {
    const key = `${group.canonical}|${group.totalCount}|${group.tier}|${group.displayText}`;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash) + 1;
};

// (BoundingBox removed; d3-cloud provides collision handling)

// Tier-based font size ranges (tighter than linear scaling)
const TIER_FONT_RANGES: Record<Tier, { min: number; max: number; weight: number; opacity: number }> = {
  S: { min: 80, max: 110, weight: 800, opacity: 1.0 },
  A: { min: 50, max: 70, weight: 700, opacity: 1.0 },
  B: { min: 32, max: 48, weight: 600, opacity: 0.95 },
  C: { min: 24, max: 36, weight: 500, opacity: 0.75 },
};

const VARIANT_MIN_COUNT = 2;
const MAX_HIGHLIGHT_VARIANTS = 2;

export default function WordCloud({
  entries,
  containerWidth,
  containerHeight,
  maxWords: _maxWords, // Keep for backward compatibility but don't use
  rotationRangeDeg = 0,
  displayMode = 'balanced',
  showPhrases = true,
  minOccurrence = 2,
  enableSpamFilter = true,
  semanticGrouping = true,
  onGroupsUpdate,
}: WordCloudProps) {
  const [groups, setGroups] = useState<SemanticGroup[]>([]);
  const [words, setWords] = useState<RenderWord[]>([]);
  const [processing, setProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number }>({
    w: containerWidth ?? 0,
    h: containerHeight ?? 0
  });
  const layoutSeed = useMemo(() => buildLayoutSeed(groups), [groups]);

  // Measure parent container if explicit width/height not provided
  useEffect(() => {
    if (containerWidth && containerHeight) {
      setMeasuredSize({ w: containerWidth, h: containerHeight });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setMeasuredSize({ w: Math.max(0, Math.floor(cr.width)), h: Math.max(0, Math.floor(cr.height)) });
      }
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setMeasuredSize({ w: Math.max(0, Math.floor(rect.width)), h: Math.max(0, Math.floor(rect.height)) });
    return () => ro.disconnect();
  }, [containerWidth, containerHeight]);

  // Process entries with new NLP engine
  useEffect(() => {
    const processEntries = async () => {
      if (entries.length === 0) {
        setGroups([]);
        if (onGroupsUpdate) {
          onGroupsUpdate([]);
        }
        return;
      }

      setProcessing(true);

      try {
        const options: Partial<ProcessorOptions> = {
          displayMode,
          showPhrases,
          minOccurrence,
          enableSpamFilter,
          semanticGrouping,
        };

        const processedGroups = await processWordCloudData(entries, options);
        setGroups(processedGroups);
        if (onGroupsUpdate) {
          const snapshot = processedGroups.map((group) => ({
            ...group,
            variants: group.variants.map((variant) => ({ ...variant })),
            languages: new Set(group.languages),
          }));
          onGroupsUpdate(snapshot);
        }
      } catch (error) {
        console.error('[WordCloud] Processing error:', error);
        setGroups([]);
      } finally {
        setProcessing(false);
      }
    };

    processEntries();
  }, [entries, displayMode, showPhrases, minOccurrence, enableSpamFilter, semanticGrouping, onGroupsUpdate]);

  // Calculate font size based on tier and count
  const getFontSize = (group: SemanticGroup, maxCount: number): number => {
    const range = TIER_FONT_RANGES[group.tier];
    const ratio = Math.log(group.totalCount + 1) / Math.log(maxCount + 1);
    return range.min + ratio * (range.max - range.min);
  };

  // Calculate positions with d3-cloud (guaranteed no overlap)
  const layoutRef = useRef<any | null>(null);
  useEffect(() => {
    const cw = containerWidth ?? measuredSize.w;
    const ch = containerHeight ?? measuredSize.h;

    if (layoutRef.current) {
      try { layoutRef.current.stop(); } catch {}
      layoutRef.current = null;
    }

    if (groups.length === 0 || cw === 0 || ch === 0) {
      setWords([]);
      return;
    }

    const maxCount = Math.max(...groups.map(g => g.totalCount));

    const baseWords = groups.map((g) => ({
      text: g.displayText,
      size: getFontSize(g, maxCount),
      __group: g,
    }));

    const variantWords = showPhrases
      ? groups.flatMap((g) => {
          const baseSize = getFontSize(g, maxCount);
          const candidates = g.variants
            .filter((variant) => variant.count >= VARIANT_MIN_COUNT && variant.text.toLowerCase() !== g.displayText.toLowerCase())
            .sort((a, b) => b.count - a.count)
            .slice(0, MAX_HIGHLIGHT_VARIANTS);

          return candidates.map((variant) => {
            const ratio = Math.min(variant.count / Math.max(g.totalCount, 1), 1);
            const factor = Math.max(0.55, Math.min(0.9, 0.55 + 0.35 * ratio));
            const size = Math.max(28, baseSize * factor);
            return {
              text: variant.text,
              size,
              __group: g,
              __variant: variant,
              __isVariant: true,
            };
          });
        })
      : [];

    const d3Words = [...baseWords, ...variantWords];

    const seededRandom = createSeededRandom(layoutSeed);
    const rotationRandom = createSeededRandom(layoutSeed ^ 0x9e3779b9);

    const rotateFn = () => {
      if (!rotationRangeDeg || rotationRangeDeg <= 0) return 0;
      // Favor clarity: 0 or 90 when rotation allowed
      return rotationRandom() < 0.5 ? 0 : 90;
    };

    const paddingFn = (d: any) => Math.max(8, Math.round((d.size as number) * 0.18));
    const fontWeightFn = (d: any) => {
      const g: SemanticGroup = d.__group;
      const range = TIER_FONT_RANGES[g.tier];
      return range.weight;
    };

    const layout = (cloud() as any)
      .size([cw, ch])
      .words(d3Words as any)
      .padding(paddingFn as any)
      .rotate(rotateFn as any)
      .font(() => 'sans-serif')
      .fontWeight(fontWeightFn as any)
      .fontSize((d: any) => d.size as number)
      .spiral('archimedean')
      .on('end', (placed: any[]) => {
        const placedWords: RenderWord[] = placed.map((w: any) => {
          const g: SemanticGroup = w.__group;
          const variant: SemanticVariant | undefined = w.__variant;
          const isVariant = Boolean(variant);
          const displayText = variant ? variant.text : g.displayText;
          const totalCount = variant ? variant.count : g.totalCount;
          const id = variant ? `${g.canonical}::${variant.normalized}` : g.canonical;

          return {
            id,
            canonical: g.canonical,
            displayText,
            totalCount,
            tier: g.tier,
            x: (w.x || 0) + cw / 2,
            y: (w.y || 0) + ch / 2,
            fontSize: w.size,
            rotation: w.rotate || 0,
            colors: g.colors,
            variants: g.variants,
            languages: new Set(g.languages),
            isVariant,
            parentCanonical: variant ? g.canonical : undefined,
            parentDisplayText: variant ? g.displayText : undefined,
          };
        });
        setWords(placedWords);
        layoutRef.current = null;
      });

    layout.random(seededRandom);
    layoutRef.current = layout;
    layout.start();

    return () => {
      try { layout.stop(); } catch {}
      layoutRef.current = null;
    };
  }, [groups, containerWidth, containerHeight, measuredSize.w, measuredSize.h, rotationRangeDeg, layoutSeed, showPhrases]);

  const cw = containerWidth ?? measuredSize.w;
  const ch = containerHeight ?? measuredSize.h;

  // Build rich tooltip content
  const getTooltipContent = (word: RenderWord): string => {
    if (word.isVariant) {
      const parentLabel = word.parentDisplayText || word.parentCanonical || word.canonical;
      return `"${word.displayText}" - ${word.totalCount} mention${word.totalCount > 1 ? 's' : ''}\nPart of "${parentLabel}"`;
    }

    if (word.variants.length === 1) {
      return `"${word.displayText}" - ${word.totalCount} mention${word.totalCount > 1 ? 's' : ''}`;
    }

    const variantList = word.variants
      .slice(0, 5) // Show top 5 variants
      .map(v => `• "${v.text}" (${v.count})`)
      .join('\n');

    const more = word.variants.length > 5 ? `\n... and ${word.variants.length - 5} more` : '';

    return `"${word.displayText}" (${word.totalCount} total)\n${variantList}${more}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ width: containerWidth ? cw : undefined, height: containerHeight ? ch : undefined }}
    >
      {/* Loading state */}
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!processing && words.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400 dark:text-gray-500">
            <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-lg font-medium">No words yet</p>
            <p className="text-sm mt-2">Share the link and start collecting words!</p>
          </div>
        </div>
      )}

      {/* Word cloud */}
      <AnimatePresence>
        {words.map((word, index) => {
          const tierStyle = TIER_FONT_RANGES[word.tier];
          const primaryColor = word.colors[0] || '#6366f1'; // Fallback color
          const isVariant = word.isVariant;
          const displayOpacity = isVariant ? Math.min(1, tierStyle.opacity * 0.85) : tierStyle.opacity;
          const fontWeight = isVariant ? Math.max(400, tierStyle.weight - 200) : tierStyle.weight;
          const textShadow = isVariant
            ? '1px 1px 4px rgba(0,0,0,0.18)'
            : word.tier === 'S' || word.tier === 'A'
              ? '3px 3px 10px rgba(0,0,0,0.3)'
              : '2px 2px 6px rgba(0,0,0,0.2)';

          // Progressive animation delays by tier
          const tierDelays = { S: 0, A: 0.1, B: 0.2, C: 0.3 };
          const baseDelay = tierDelays[word.tier] || 0;

          return (
            <div
              key={word.id}
              className="absolute"
              style={{ left: word.x, top: word.y, transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: displayOpacity,
                  scale: 1,
                  rotate: word.rotation
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: baseDelay + index * 0.02,
                }}
                className="font-bold whitespace-nowrap select-none font-chinese group cursor-default hover:scale-110 transition-transform"
                style={{
                  fontSize: `${word.fontSize}px`,
                  fontWeight,
                  color: primaryColor,
                  textShadow,
                  // Z-index: combine tier priority + fontSize for guaranteed layering
                  // Large words ALWAYS appear on top of smaller ones
                  zIndex: (word.tier === 'S' ? 1000 :
                           word.tier === 'A' ? 800 :
                           word.tier === 'B' ? 600 : 400) + Math.floor(word.fontSize),
                }}
                title={getTooltipContent(word)}
              >
                {word.displayText}
                {word.languages.size > 1 && (
                  <span className="ml-1 text-xs opacity-50">🌐</span>
                )}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
