'use client';

import { useState, useEffect } from 'react';
import CreateElementModal from './create-element-modal';
import type { ElementResponse, ColorResponse } from '../types/ipc';
import { colorNameToHex } from '../lib/utils';

interface AddedElement {
  elementId: string;
  elementName: string;
  colorId: string;
  colorName: string;
  quantityNeeded: number;
  imageUrl: string | null;
}

interface ProductElementsModalProps {
  isOpen: boolean;
  productId: string | null;
  productName: string;
  onClose: () => void;
  onDone: () => void;
}

export default function ProductElementsModal({
  isOpen, productId, productName, onClose, onDone,
}: ProductElementsModalProps) {
  const [elements, setElements] = useState<ElementResponse[]>([]);
  const [colors, setColors] = useState<ColorResponse[]>([]);
  const [addedElements, setAddedElements] = useState<AddedElement[]>([]);
  const [showCreateElement, setShowCreateElement] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Selection state for adding existing elements
  const [selectedElementId, setSelectedElementId] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setAddedElements([]);
      setError('');
      resetSelectionForm();
    }
  }, [isOpen]);

  function resetSelectionForm() {
    setSelectedElementId('');
    setSelectedColorId('');
    setQuantity('1');
  }

  async function loadData() {
    if (!window.electron) return;
    const [elemResult, colorResult] = await Promise.all([
      window.electron.getElements(),
      window.electron.getColors(),
    ]);
    if (elemResult.success) setElements(elemResult.data);
    if (colorResult.success) setColors(colorResult.data);
  }

  async function handleAddElement() {
    if (!selectedElementId) { setError('Select an element'); return; }
    if (!selectedColorId) { setError('Select a color'); return; }
    if (!quantity || Number(quantity) < 1) { setError('Quantity must be at least 1'); return; }
    if (!productId || !window.electron) return;

    // Check for duplicate
    const dup = addedElements.find(
      ae => ae.elementId === selectedElementId && ae.colorId === selectedColorId
    );
    if (dup) {
      setError(`${dup.elementName} (${dup.colorName}) is already added`);
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      const result = await window.electron.addProductElement({
        productId,
        elementId: selectedElementId,
        colorId: selectedColorId,
        quantityNeeded: Number(quantity),
      });

      if (!result.success) {
        setError(result.error || 'Failed to add element');
        return;
      }

      const elem = elements.find(e => e.id === selectedElementId);
      const col = colors.find(c => c.id === selectedColorId);

      setAddedElements(prev => [
        ...prev,
        {
          elementId: selectedElementId,
          elementName: elem?.uniqueName || 'Unknown',
          colorId: selectedColorId,
          colorName: col?.colorName || 'Unknown',
          quantityNeeded: Number(quantity),
          imageUrl: elem?.imageUrl || null,
        },
      ]);

      resetSelectionForm();
    } catch {
      setError('Failed to add element');
    } finally {
      setIsAdding(false);
    }
  }

  function handleElementCreated(created: { id: string; uniqueName: string; material: string; weightGrams: number; imageUrl: string | null; colorId: string; colorName: string }) {
    // Refresh the elements list
    setElements(prev => [...prev, {
      id: created.id,
      uniqueName: created.uniqueName,
      material: created.material,
      weightGrams: created.weightGrams,
      imageUrl: created.imageUrl,
      createdAt: new Date(),
    }]);
    // Auto-select the new element and color
    setSelectedElementId(created.id);
    setSelectedColorId(created.colorId);
    // Refresh colors too
    loadData();
    setShowCreateElement(false);
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Product Elements
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add elements to <span className="font-medium text-zinc-700 dark:text-zinc-300">{productName}</span>
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Added Elements List */}
            {addedElements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Added Elements ({addedElements.length})
                </h3>
                <div className="space-y-1.5">
                  {addedElements.map((ae, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800"
                    >
                      {ae.imageUrl ? (
                        <img src={ae.imageUrl} alt={ae.elementName} className="h-8 w-8 rounded object-contain bg-white dark:bg-zinc-700" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 text-zinc-400 dark:bg-zinc-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {ae.elementName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {ae.colorName} &middot; Qty: {ae.quantityNeeded}
                        </p>
                      </div>
                      <div
                        className="h-5 w-5 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0"
                        style={{ backgroundColor: colorNameToHex(ae.colorName) }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Element Form */}
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Add Element
              </h3>

              {/* Select Element */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Element
                </label>
                <select
                  value={selectedElementId}
                  onChange={(e) => setSelectedElementId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select an element...</option>
                  {elements.map(el => (
                    <option key={el.id} value={el.id}>
                      {el.uniqueName} ({el.material}, {el.weightGrams}g)
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Color */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Color
                </label>
                <select
                  value={selectedColorId}
                  onChange={(e) => setSelectedColorId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select a color...</option>
                  {colors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.colorName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Quantity per unit
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddElement}
                  disabled={isAdding || !selectedElementId || !selectedColorId}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? 'Adding...' : 'Add to Product'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateElement(true)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  + New Element
                </button>
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={onDone}
              className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
            >
              Done — Finish Product
            </button>
          </div>
        </div>
      </div>

      {/* Create Element Sub-modal */}
      <CreateElementModal
        isOpen={showCreateElement}
        onClose={() => setShowCreateElement(false)}
        onCreated={handleElementCreated}
      />
    </>
  );
}
