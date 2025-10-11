import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Entry } from '../types';

interface WordCloudProps {
  entries: Entry[];
  containerWidth?: number;
  containerHeight?: number;
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

export default function WordCloud({ entries, containerWidth = 800, containerHeight = 600 }: WordCloudProps) {
  const [words, setWords] = useState<PositionedWord[]>([]);

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
    if (processedWords.length === 0) {
      setWords([]);
      return;
    }

    const maxCount = Math.max(...processedWords.map(w => w.count));
    const minFontSize = 20;
    const maxFontSize = 100;

    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
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
          newBox.x + newBox.width <= containerWidth &&
          newBox.y >= 0 &&
          newBox.y + newBox.height <= containerHeight
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
        const radius = Math.random() * Math.min(containerWidth, containerHeight) * 0.3;
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
  }, [processedWords, containerWidth, containerHeight]);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p className="text-lg font-medium">No words yet</p>
          <p className="text-sm mt-2">Share the link and start collecting words!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <AnimatePresence>
        {words.map((word, index) => {
          // For words with multiple colors, show with gradient or primary color
          const primaryColor = word.colors[0];
          const hasMultipleColors = word.colors.length > 1;

          return (
            <motion.div
              key={`${word.normalizedText}-${index}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: word.x,
                y: word.y,
                rotate: word.rotation,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: index * 0.03,
              }}
              className="absolute font-bold whitespace-nowrap select-none font-chinese group cursor-default"
              style={{
                fontSize: `${word.fontSize}px`,
                color: primaryColor,
                transform: 'translate(-50%, -50%)',
                textShadow: '2px 2px 6px rgba(0,0,0,0.2)',
              }}
              title={`"${word.displayText}" - submitted ${word.count} time${word.count > 1 ? 's' : ''}`}
            >
              <span className="relative">
                {word.displayText}

                {/* Multi-color indicator dots */}
                {hasMultipleColors && (
                  <span className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1">
                    {word.colors.slice(0, 5).map((color, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {word.colors.length > 5 && (
                      <span className="text-xs opacity-60 group-hover:opacity-100 transition-opacity">
                        +{word.colors.length - 5}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
