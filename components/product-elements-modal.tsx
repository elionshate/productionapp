'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ElementResponse } from '../types/ipc';
import { colorNameToHex } from '../lib/utils';
import { useI18n } from '../lib/i18n';

interface SelectedElement {
  elementId: string;
  quantityNeeded: number;
  peId?: string; // existing ProductElement id (for editing)
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
  const { t } = useI18n();
  const [allElements, setAllElements] = useState<ElementResponse[]>([]);
  const [selected, setSelected] = useState<Map<string, SelectedElement>>(new Map());
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSearch('');
      setError('');
    }
  }, [isOpen]);

  async function loadData() {
    if (!window.electron) return;
    const elemResult = await window.electron.getElements();
    if (elemResult.success) setAllElements(elemResult.data);

    // Pre-select existing product elements
    if (productId) {
      const productResult = await window.electron.getProductById(productId);
      if (productResult.success && productResult.data?.productElements) {
        const map = new Map<string, SelectedElement>();
        for (const pe of productResult.data.productElements) {
          map.set(pe.elementId, {
            elementId: pe.elementId,
            quantityNeeded: pe.quantityNeeded,
            peId: pe.id,
          });
        }
        setSelected(map);
      } else {
        setSelected(new Map());
      }
    } else {
      setSelected(new Map());
    }
  }

  const isSearching = search.trim().length > 0;

  // Group elements by uniqueName, filtered by search
  const groupedElements = useMemo(() => {
    const filtered = search.trim()
      ? allElements.filter(el =>
          el.uniqueName.toLowerCase().includes(search.toLowerCase()) ||
          el.color.toLowerCase().includes(search.toLowerCase()) ||
          el.material.toLowerCase().includes(search.toLowerCase()) ||
          (el.label && el.label.toLowerCase().includes(search.toLowerCase()))
        )
      : allElements;

    const groups = new Map<string, ElementResponse[]>();
    for (const el of filtered) {
      const key = el.uniqueName;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(el);
    }
    // Sort groups alphabetically
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allElements, search]);

  // Count selected elements per group for badge display
  const selectedPerGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const el of allElements) {
      if (selected.has(el.id)) {
        counts.set(el.uniqueName, (counts.get(el.uniqueName) || 0) + 1);
      }
    }
    return counts;
  }, [allElements, selected]);

  const toggleGroup = useCallback((groupName: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);

  function toggleElement(el: ElementResponse) {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(el.id)) {
        next.delete(el.id);
      } else {
        next.set(el.id, { elementId: el.id, quantityNeeded: 1 });
      }
      return next;
    });
  }

  function setQuantity(elementId: string, qty: number) {
    setSelected(prev => {
      const next = new Map(prev);
      const entry = next.get(elementId);
      if (entry) {
        next.set(elementId, { ...entry, quantityNeeded: Math.max(1, qty) });
      }
      return next;
    });
  }

  async function handleSave() {
    if (!productId || !window.electron) return;
    setIsSaving(true);
    setError('');

    try {
      // Load current product elements to diff
      const productResult = await window.electron.getProductById(productId);
      const existingPEs = productResult.success && productResult.data?.productElements
        ? productResult.data.productElements
        : [];

      const existingMap = new Map(existingPEs.map(pe => [pe.elementId, pe]));
      const selectedMap = selected;

      // Remove elements that are no longer selected
      for (const pe of existingPEs) {
        if (!selectedMap.has(pe.elementId)) {
          await window.electron.removeProductElement(pe.id);
        }
      }

      // Add new or update existing
      for (const [elementId, sel] of selectedMap) {
        const existing = existingMap.get(elementId);
        if (!existing) {
          // Add new
          const result = await window.electron.addProductElement({
            productId,
            elementId,
            quantityNeeded: sel.quantityNeeded,
          });
          if (!result.success) {
            setError(result.error || `Failed to add element`);
            return;
          }
        } else if (existing.quantityNeeded !== sel.quantityNeeded) {
          // Quantity changed — remove and re-add (no update endpoint for PE)
          await window.electron.removeProductElement(existing.id);
          const result = await window.electron.addProductElement({
            productId,
            elementId,
            quantityNeeded: sel.quantityNeeded,
          });
          if (!result.success) {
            setError(result.error || `Failed to update element`);
            return;
          }
        }
      }

      onDone();
    } catch {
      setError('Failed to save elements');
    } finally {
      setIsSaving(false);
    }
  }

  const selectedCount = selected.size;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {t('productElements.title')}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('productElements.chooseFor')} <span className="font-medium text-zinc-700 dark:text-zinc-300">{productName}</span>
              {selectedCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  {selectedCount} selected
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('productElements.searchPlaceholder')}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:border-red-900 dark:text-red-400 shrink-0">
            {error}
          </div>
        )}

        {/* Element Grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {groupedElements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm">{search ? t('productElements.noMatch') : t('productElements.noElements')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedElements.map(([groupName, elements]) => {
                const isOpen = isSearching || openGroups.has(groupName);
                const groupSelectedCount = selectedPerGroup.get(groupName) || 0;
                return (
                  <div key={groupName} className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    {/* Accordion header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupName)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{groupName}</h3>
                      <span className="text-xs text-zinc-400">({elements.length})</span>
                      {groupSelectedCount > 0 && (
                        <span className="ml-auto inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                          {groupSelectedCount} selected
                        </span>
                      )}
                    </button>
                    {/* Accordion body — only rendered when open (lazy) */}
                    {isOpen && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {elements.map(el => {
                            const isSelected = selected.has(el.id);
                            const sel = selected.get(el.id);
                            return (
                              <div
                                key={el.id}
                                className={`relative rounded-lg border-2 p-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20 ring-1 ring-blue-500/30'
                                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600'
                                }`}
                                onClick={() => toggleElement(el)}
                              >
                                {/* Selection indicator */}
                                {isSelected && (
                                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

                                {/* Image */}
                                <div className="aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700 mb-2">
                                  {el.imageUrl ? (
                                    <img src={el.imageUrl} alt={el.uniqueName} className="h-full w-full object-contain p-1" loading="lazy" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                  )}
                                </div>

                                {/* Color swatches + info */}
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div
                                    className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0"
                                    style={{ backgroundColor: colorNameToHex(el.color) }}
                                    title={el.color}
                                  />
                                  {el.isDualColor && el.color2 && (
                                    <div
                                      className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0 -ml-2"
                                      style={{ backgroundColor: colorNameToHex(el.color2) }}
                                      title={el.color2}
                                    />
                                  )}
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate ml-0.5">
                                    {el.color}{el.isDualColor && el.color2 ? ` + ${el.color2}` : ''}
                                  </span>
                                </div>

                                {el.label && (
                                  <span className="inline-block mb-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                    {el.label}
                                  </span>
                                )}
                                <p className="text-xs text-zinc-400 truncate">{el.material} · {el.weightGrams}g</p>

                                {/* Quantity input (only if selected) */}
                                {isSelected && (
                                  <div className="mt-2 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                    <label className="text-[10px] font-medium text-blue-600 dark:text-blue-400 shrink-0">{t('productElements.qty')}:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={sel?.quantityNeeded || 1}
                                      onChange={(e) => setQuantity(el.id, parseInt(e.target.value, 10) || 1)}
                                      className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-blue-500 dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-700 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {selectedCount} {t('inventory.element')}{selectedCount !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('productElements.saving') : t('productElements.saveElements')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
