'use client';

import { useState } from 'react';

const RAINBOW_COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1F2937' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Fuchsia', hex: '#D946EF' },
];

interface ColorPickerProps {
  selectedColor: string | null;
  existingColors: string[];
  onSelect: (colorName: string) => void;
}

export default function ColorPicker({ selectedColor, existingColors, onSelect }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState('');
  const normalizedExisting = existingColors.map(c => c.toLowerCase());

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Color <span className="text-red-500">*</span>
      </label>

      {/* Compact color grid */}
      <div className="flex flex-wrap gap-1.5">
        {RAINBOW_COLORS.map((color) => {
          const isSelected = selectedColor?.toLowerCase() === color.name.toLowerCase();
          const isExisting = normalizedExisting.includes(color.name.toLowerCase());
          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelect(color.name)}
              className={`relative h-7 w-7 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${
                isSelected
                  ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-900 scale-110'
                  : color.name === 'White'
                    ? 'border-zinc-300 dark:border-zinc-600'
                    : 'border-transparent'
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {isExisting && (
                <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border border-white dark:border-zinc-900" />
              )}
              {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className={`absolute inset-0 m-auto h-3.5 w-3.5 ${color.name === 'White' || color.name === 'Yellow' ? 'text-zinc-800' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Inline custom color */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && customColor.trim()) { e.preventDefault(); onSelect(customColor.trim()); setCustomColor(''); } }}
          placeholder="Custom color..."
          className="flex-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <button
          type="button"
          onClick={() => { if (customColor.trim()) { onSelect(customColor.trim()); setCustomColor(''); } }}
          disabled={!customColor.trim()}
          className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          Use
        </button>
      </div>

      {selectedColor && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Selected: <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedColor}</span>
        </p>
      )}
    </div>
  );
}

export { RAINBOW_COLORS };
