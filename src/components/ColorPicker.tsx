import { motion } from 'framer-motion';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const COLORS = [
  { name: 'Red', value: '#ef4444', hover: '#dc2626' },
  { name: 'Blue', value: '#3b82f6', hover: '#2563eb' },
  { name: 'Green', value: '#10b981', hover: '#059669' },
  { name: 'Purple', value: '#8b5cf6', hover: '#7c3aed' },
  { name: 'Yellow', value: '#eab308', hover: '#ca8a04' },
  { name: 'Orange', value: '#f97316', hover: '#ea580c' },
];

export default function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Choose your color
      </label>
      <div className="flex gap-3 flex-wrap">
        {COLORS.map((color) => (
          <motion.button
            key={color.value}
            type="button"
            onClick={() => onColorChange(color.value)}
            className={`relative w-12 h-12 rounded-full transition-all ${
              selectedColor === color.value
                ? 'ring-4 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color.value }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={`Select ${color.name}`}
          >
            {selectedColor === color.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg
                  className="w-6 h-6 text-white drop-shadow-lg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export { COLORS };
