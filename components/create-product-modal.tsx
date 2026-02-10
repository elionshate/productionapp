'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RawMaterialResponse } from '../types/ipc';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (product: { id: string; serialNumber: string; category: string }) => void;
  existingCategories: string[];
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function CreateProductModal({
  isOpen, onClose, onCreated, existingCategories,
}: CreateProductModalProps) {
  const [serialNumber, setSerialNumber] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [unitsPerBox, setUnitsPerBox] = useState('1');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [boxRawMaterialId, setBoxRawMaterialId] = useState('');
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterialResponse[]>([]);

  useEffect(() => {
    if (isOpen && window.electron) {
      window.electron.getRawMaterials().then(r => {
        if (r.success) setAvailableMaterials(r.data);
      });
    }
  }, [isOpen]);

  function resetForm() {
    setSerialNumber('');
    setLabel('');
    setCategory('');
    setCustomCategory('');
    setUnitsPerBox('1');
    setImageDataUrl(null);
    setError('');
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setBoxRawMaterialId('');
  }

  async function handleFileSelected(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Invalid image format. Use PNG, JPG, GIF, WEBP, or BMP.');
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

    const finalCategory = category === '__custom__' ? customCategory.trim() : category;

    if (!serialNumber.trim()) { setError('Serial number is required'); return; }
    if (!finalCategory) { setError('Category is required'); return; }
    if (!imageDataUrl) { setError('Product image is required'); return; }
    if (!unitsPerBox || Number(unitsPerBox) < 1) { setError('Units per box must be at least 1'); return; }

    if (!window.electron) { setError('Electron not available'); return; }

    setIsSubmitting(true);
    try {
      const result = await window.electron.createProduct({
        serialNumber: serialNumber.trim(),
        category: finalCategory,
        label: label.trim(),
        unitsPerBox: Number(unitsPerBox),
        imageUrl: imageDataUrl,
        boxRawMaterialId: boxRawMaterialId || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create product');
        return;
      }

      resetForm();
      onCreated({
        id: result.data.id,
        serialNumber: result.data.serialNumber,
        category: result.data.category,
      });
    } catch {
      setError('Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">New Product</h2>
          <button onClick={() => { resetForm(); onClose(); }} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
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

          {/* Row 1: Image + Serial Number */}
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
                title="Click or drag image here"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDragging ? 'text-blue-500' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <p className="text-[9px] font-medium text-zinc-400 mt-0.5">Image *</p>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Serial Number <span className="text-red-500">*</span></label>
              <input
                type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. BKT-001" autoFocus
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Label</label>
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Premium Red Bucket"
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {/* Row 2: Category + Units/Box */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Category <span className="text-red-500">*</span></label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">Select...</option>
                {existingCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">+ New</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Units/Box <span className="text-red-500">*</span></label>
              <input
                type="number" value={unitsPerBox} onChange={(e) => setUnitsPerBox(e.target.value)} min="1"
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Custom Category (conditional) */}
          {category === '__custom__' && (
            <input
              type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="New category name"
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}

          {/* Box Type (Raw Material) */}
          {availableMaterials.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Box Type (for assembly deduction)</label>
              <select
                value={boxRawMaterialId}
                onChange={(e) => setBoxRawMaterialId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">None (no box deduction)</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stockQty.toLocaleString()} {m.unit})</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  );
}
