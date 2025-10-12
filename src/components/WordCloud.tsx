import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Entry } from '../types';
import { processWordCloudData, type ProcessorOptions } from '../lib/wordCloudProcessor';
import type { SemanticGroup, Tier } from '../lib/semanticGrouping';

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
}

interface PositionedGroup extends SemanticGroup {
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pad?: number;
}

// Tier-based font size ranges (tighter than linear scaling)
const TIER_FONT_RANGES: Record<Tier, { min: number; max: number; weight: number; opacity: number }> = {
  S: { min: 80, max: 110, weight: 800, opacity: 1.0 },
  A: { min: 50, max: 70, weight: 700, opacity: 1.0 },
  B: { min: 32, max: 48, weight: 600, opacity: 0.95 },
  C: { min: 24, max: 36, weight: 500, opacity: 0.75 },
};

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
}: WordCloudProps) {
  const [groups, setGroups] = useState<SemanticGroup[]>([]);
  const [words, setWords] = useState<PositionedGroup[]>([]);
  const [processing, setProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number }>({
    w: containerWidth ?? 0,
    h: containerHeight ?? 0
  });

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
      } catch (error) {
        console.error('[WordCloud] Processing error:', error);
        setGroups([]);
      } finally {
        setProcessing(false);
      }
    };

    processEntries();
  }, [entries, displayMode, showPhrases, minOccurrence, enableSpamFilter, semanticGrouping]);

  // Calculate font size based on tier and count
  const getFontSize = (group: SemanticGroup, maxCount: number): number => {
    const range = TIER_FONT_RANGES[group.tier];
    const ratio = Math.log(group.totalCount + 1) / Math.log(maxCount + 1);
    return range.min + ratio * (range.max - range.min);
  };

  // Check if two boxes overlap
  const checkCollision = (box1: BoundingBox, box2: BoundingBox, padding = 10): boolean => {
    return !(
      box1.x + box1.width + padding < box2.x ||
      box1.x > box2.x + box2.width + padding ||
      box1.y + box1.height + padding < box2.y ||
      box1.y > box2.y + box2.height + padding
    );
  };

  // Calculate positions with collision detection
  useEffect(() => {
    const cw = containerWidth ?? measuredSize.w;
    const ch = containerHeight ?? measuredSize.h;

    if (groups.length === 0 || cw === 0 || ch === 0) {
      setWords([]);
      return;
    }

    const maxCount = Math.max(...groups.map(g => g.totalCount));
    const centerX = cw / 2;
    const centerY = ch / 2;
    const positions: PositionedGroup[] = [];
    const boundingBoxes: BoundingBox[] = [];
    const shortest = Math.min(cw, ch);
    const centerClearRadius = shortest * 0.10;

    groups.forEach((group) => {
      // Calculate font size based on tier
      const fontSize = getFontSize(group, maxCount);

      // Estimate text width
      const avgCharWidth = fontSize * 0.6;
      const textWidth = group.displayText.length * avgCharWidth;
      const textHeight = fontSize * 1.2;

      // Try to place the word
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200;

      // Tier S gets priority placement (center area)
      const isTierS = group.tier === 'S';
      const isTierA = group.tier === 'A';

      while (!placed && attempts < maxAttempts) {
        let x, y;

        if (attempts === 0 && positions.length === 0) {
          // First word in center
          x = centerX;
          y = centerY;
        } else if (isTierS && attempts < 50) {
          // Tier S: try center area first
          const angle = attempts * 0.8;
          const radius = Math.sqrt(attempts + 1) * Math.max(30, shortest * 0.04);
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        } else if (isTierA && attempts < 80) {
          // Tier A: middle ring
          const angle = attempts * 0.6;
          const radius = centerClearRadius + Math.sqrt(attempts + 1) * Math.max(25, shortest * 0.035);
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        } else {
          // Tier B/C: outer areas
          const angle = attempts * 0.5;
          const baseStep = Math.max(20, shortest * 0.03) + fontSize * 0.15;
          const radius = Math.sqrt(attempts + 1) * baseStep;
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        }

        // Create bounding box
        const pad = Math.max(8, Math.floor(fontSize * 0.2));
        const newBox: BoundingBox = {
          x: x - textWidth / 2,
          y: y - textHeight / 2,
          width: textWidth,
          height: textHeight,
          pad,
        };

        // Check if it fits in container
        if (
          newBox.x >= 0 &&
          newBox.x + newBox.width <= cw &&
          newBox.y >= 0 &&
          newBox.y + newBox.height <= ch &&
          (positions.length === 0 || Math.hypot(x - centerX, y - centerY) > centerClearRadius * 0.5)
        ) {
          // Check collision with other words
          let hasCollision = false;
          for (const existingBox of boundingBoxes) {
            const p1 = newBox.pad || 8;
            const p2 = existingBox.pad || 8;
            const inflatedNew: BoundingBox = {
              x: newBox.x - p1 / 2,
              y: newBox.y - p1 / 2,
              width: newBox.width + p1,
              height: newBox.height + p1,
            };
            const inflatedExisting: BoundingBox = {
              x: existingBox.x - p2 / 2,
              y: existingBox.y - p2 / 2,
              width: existingBox.width + p2,
              height: existingBox.height + p2,
            };
            if (checkCollision(inflatedNew, inflatedExisting)) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            // Place the word
            const rotation = rotationRangeDeg > 0 ? (Math.random() - 0.5) * rotationRangeDeg : 0;
            positions.push({
              ...group,
              x,
              y,
              fontSize,
              rotation,
            });
            boundingBoxes.push(newBox);
            placed = true;
          }
        }

        attempts++;
      }

      // Fallback placement if couldn't place after max attempts
      if (!placed) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(cw, ch) * 0.35;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const rotation = rotationRangeDeg > 0 ? (Math.random() - 0.5) * rotationRangeDeg : 0;

        positions.push({
          ...group,
          x,
          y,
          fontSize,
          rotation,
        });
      }
    });

    setWords(positions);
  }, [groups, containerWidth, containerHeight, measuredSize.w, measuredSize.h, rotationRangeDeg]);

  const cw = containerWidth ?? measuredSize.w;
  const ch = containerHeight ?? measuredSize.h;

  // Build rich tooltip content
  const getTooltipContent = (word: PositionedGroup): string => {
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

          // Progressive animation delays by tier
          const tierDelays = { S: 0, A: 0.1, B: 0.2, C: 0.3 };
          const baseDelay = tierDelays[word.tier] || 0;

          return (
            <div
              key={`${word.canonical}-${index}`}
              className="absolute"
              style={{ left: word.x, top: word.y, transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: tierStyle.opacity,
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
                  fontWeight: tierStyle.weight,
                  color: primaryColor,
                  textShadow: word.tier === 'S' || word.tier === 'A'
                    ? '3px 3px 10px rgba(0,0,0,0.3)'
                    : '2px 2px 6px rgba(0,0,0,0.2)',
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
