'use client';

import { useState, useRef, useCallback } from 'react';
import ColorPicker from './color-picker';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface CreateElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (element: { id: string; uniqueName: string; label: string; material: string; weightGrams: number; imageUrl: string | null; color: string; color2: string | null; isDualColor: boolean }) => void;
}

export default function CreateElementModal({ isOpen, onClose, onCreated }: CreateElementModalProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [material, setMaterial] = useState('');
  const [weight, setWeight] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedColor2, setSelectedColor2] = useState<string | null>(null);
  const [isDualColor, setIsDualColor] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName(''); setLabel(''); setMaterial(''); setWeight('');
    setImageDataUrl(null); setSelectedColor(null);
    setSelectedColor2(null); setIsDualColor(false);
    setError(''); setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileSelected(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid format. Use PNG, JPG, GIF, WEBP, or BMP.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
      setError('');
    } catch {
      setError('Failed to read image file');
    }
    // Clear input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!material.trim()) { setError('Material is required'); return; }
    if (!weight || Number(weight) <= 0) { setError('Weight must be > 0'); return; }
    if (!selectedColor) { setError('Select a color'); return; }
    if (isDualColor && !selectedColor2) { setError('Select a second color for dual-color'); return; }
    if (!window.electron) { setError('Electron not available'); return; }

    setIsSubmitting(true);
    try {
      const elementResult = await window.electron.createElement({
        uniqueName: name.trim(),
        label: label.trim() || '',
        material: material.trim(),
        weightGrams: Number(weight),
        color: selectedColor,
        color2: isDualColor ? selectedColor2 || undefined : undefined,
        isDualColor,
        imageUrl: imageDataUrl || undefined,
      });
      if (!elementResult.success) { setError(elementResult.error || 'Failed to create element'); return; }

      onCreated({
        id: elementResult.data.id,
        uniqueName: elementResult.data.uniqueName,
        label: elementResult.data.label,
        material: elementResult.data.material,
        weightGrams: elementResult.data.weightGrams,
        imageUrl: elementResult.data.imageUrl,
        color: elementResult.data.color,
        color2: elementResult.data.color2,
        isDualColor: elementResult.data.isDualColor,
      });
      resetForm();
    } catch {
      setError('Failed to create element');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">New Element</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Row 1: Image + Name */}
          <div className="flex items-start gap-3">
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" onChange={handleFileInputChange} className="hidden" />
            {imageDataUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img src={imageDataUrl} alt="Preview" className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDragging ? 'text-blue-500' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bucket, Shovel" autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Row 2: Label (optional) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Label <span className="text-zinc-400 dark:text-zinc-500">(optional)</span></label>
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="Groups in production view"
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Row 3: Material + Weight side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Material <span className="text-red-500">*</span></label>
              <input
                type="text" value={material} onChange={(e) => setMaterial(e.target.value)}
                placeholder="Plastic, Metal..."
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Weight (g) <span className="text-red-500">*</span></label>
              <input
                type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="150" min="0.1" step="0.1"
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Row 3: Color Picker (compact) */}
          <ColorPicker
            selectedColor={selectedColor}
            existingColors={[]}
            onSelect={setSelectedColor}
          />

          {/* Row 4: Dual Color */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dualColor"
              checked={isDualColor}
              onChange={(e) => { setIsDualColor(e.target.checked); if (!e.target.checked) setSelectedColor2(null); }}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="dualColor" className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dual color element</label>
          </div>

          {isDualColor && (
            <ColorPicker
              selectedColor={selectedColor2}
              existingColors={[]}
              onSelect={setSelectedColor2}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
