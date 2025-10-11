import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Entry } from '../types';

interface WordCloudProps {
  entries: Entry[];
  containerWidth?: number; // optional; if not provided, fills parent
  containerHeight?: number; // optional; if not provided, fills parent
}

interface ProcessedWord {
  normalizedText: string;
  displayText: string;
  count: number;
  colors: string[];
  allTexts: string[];
}

interface PositionedWord extends ProcessedWord {
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
}

export default function WordCloud({ entries, containerWidth, containerHeight }: WordCloudProps) {
  const [words, setWords] = useState<PositionedWord[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number }>({ w: containerWidth ?? 0, h: containerHeight ?? 0 });

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
    // Initial measure
    const rect = el.getBoundingClientRect();
    setMeasuredSize({ w: Math.max(0, Math.floor(rect.width)), h: Math.max(0, Math.floor(rect.height)) });
    return () => ro.disconnect();
  }, [containerWidth, containerHeight]);

  // Process entries into word cloud data with multi-color support
  const processedWords = useMemo(() => {
    // Group by normalized_text and count frequency
    const wordMap = new Map<string, {
      texts: string[];
      count: number;
      colors: string[];
    }>();

    entries.forEach((entry) => {
      const key = entry.normalized_text || entry.text.toLowerCase();
      const existing = wordMap.get(key);

      if (existing) {
        existing.count += 1;
        existing.colors.push(entry.color);
        existing.texts.push(entry.text);
      } else {
        wordMap.set(key, {
          texts: [entry.text],
          count: 1,
          colors: [entry.color],
        });
      }
    });

    // Convert to array and sort by frequency (highest first)
    const wordsArray = Array.from(wordMap.entries()).map(([normalizedText, data]) => ({
      normalizedText,
      displayText: data.texts[0],  // Display the first original text
      allTexts: data.texts,
      count: data.count,
      colors: data.colors,
    }));

    wordsArray.sort((a, b) => b.count - a.count);

    return wordsArray;
  }, [entries]);

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

    if (processedWords.length === 0 || cw === 0 || ch === 0) {
      setWords([]);
      return;
    }

    const maxCount = Math.max(...processedWords.map(w => w.count));
    const minFontSize = 20;
    const maxFontSize = 100;

    const centerX = cw / 2;
    const centerY = ch / 2;
    const positions: PositionedWord[] = [];
    const boundingBoxes: BoundingBox[] = [];

    processedWords.forEach((word) => {
      // Calculate font size based on frequency (bigger = more frequent)
      const fontSize = minFontSize + ((word.count / maxCount) * (maxFontSize - minFontSize));

      // Estimate text width (rough approximation)
      const avgCharWidth = fontSize * 0.6;
      const textWidth = word.displayText.length * avgCharWidth;
      const textHeight = fontSize * 1.2;

      // Try to place the word
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        let x, y;

        if (attempts === 0 && positions.length === 0) {
          // First word in center
          x = centerX;
          y = centerY;
        } else {
          // Spiral outward from center
          const angle = attempts * 0.5;
          const radius = Math.sqrt(attempts + 1) * 30;
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        }

        // Create bounding box for this position
        const newBox: BoundingBox = {
          x: x - textWidth / 2,
          y: y - textHeight / 2,
          width: textWidth,
          height: textHeight,
        };

        // Check if it fits in container
        if (
          newBox.x >= 0 &&
          newBox.x + newBox.width <= cw &&
          newBox.y >= 0 &&
          newBox.y + newBox.height <= ch
        ) {
          // Check collision with other words
          let hasCollision = false;
          for (const existingBox of boundingBoxes) {
            if (checkCollision(newBox, existingBox)) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            // Place the word
            const rotation = (Math.random() - 0.5) * 10; // Less rotation for better readability
            positions.push({
              ...word,
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

      // If we couldn't place it after max attempts, place it anyway (fallback)
      if (!placed) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(cw, ch) * 0.3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const rotation = (Math.random() - 0.5) * 10;

        positions.push({
          ...word,
          x,
          y,
          fontSize,
          rotation,
        });
      }
    });

    setWords(positions);
  }, [processedWords, containerWidth, containerHeight, measuredSize.w, measuredSize.h]);

  const cw = containerWidth ?? measuredSize.w;
  const ch = containerHeight ?? measuredSize.h;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ width: containerWidth ? cw : undefined, height: containerHeight ? ch : undefined }}
    >
      {words.length === 0 && (
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
      <AnimatePresence>
        {words.map((word, index) => {
          // For words with multiple colors, show with gradient or primary color
          const primaryColor = word.colors[0];

          return (
            <div
              key={`${word.normalizedText}-${index}`}
              className="absolute"
              style={{ left: word.x, top: word.y, transform: 'translate(-50%, -50%)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: word.rotation }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: index * 0.03,
                }}
                className="font-bold whitespace-nowrap select-none font-chinese group cursor-default"
                style={{
                  fontSize: `${word.fontSize}px`,
                  color: primaryColor,
                  textShadow: '2px 2px 6px rgba(0,0,0,0.2)',
                }}
                title={`"${word.displayText}" - submitted ${word.count} time${word.count > 1 ? 's' : ''}`}
              >
                {word.displayText}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
