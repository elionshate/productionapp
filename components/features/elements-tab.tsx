'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ElementResponse, RawMaterialResponse } from '../../types/ipc';
import { colorNameToHex } from '../../lib/utils';

export default function ElementsTab() {
  const [elements, setElements] = useState<ElementResponse[]>([]);
  const [isLoadingElements, setIsLoadingElements] = useState(true);
  const [showCreateElement, setShowCreateElement] = useState(false);
  const [elementSearch, setElementSearch] = useState('');
  const [activeElementCategory, setActiveElementCategory] = useState<string>('All');

  const elementCategories = useMemo(() => {
    const names = new Set(elements.map(e => e.uniqueName));
    return ['All', ...Array.from(names).sort()];
  }, [elements]);

  const filteredElements = useMemo(() => {
    let filtered = elements;
    if (activeElementCategory !== 'All') {
      filtered = filtered.filter(e => e.uniqueName === activeElementCategory);
    }
    if (elementSearch.trim()) {
      const q = elementSearch.trim().toLowerCase();
      filtered = filtered.filter(e =>
        e.uniqueName.toLowerCase().includes(q) ||
        e.color.toLowerCase().includes(q) ||
        e.material.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [elements, elementSearch, activeElementCategory]);

  useEffect(() => {
    loadElements();
  }, []);

  async function loadElements() {
    if (!window.electron) { setIsLoadingElements(false); return; }
    setIsLoadingElements(true);
    try {
      const result = await window.electron.getElements();
      if (result.success) setElements(result.data);
    } catch (err) {
      console.error('Failed to load elements:', err);
    } finally {
      setIsLoadingElements(false);
    }
  }

  async function handleDeleteElement(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteElement(id);
      if (result.success) {
        setElements(prev => prev.filter(e => e.id !== id));
      } else {
        alert(result.error || 'Failed to delete element');
      }
    } catch (err) {
      console.error('Failed to delete element:', err);
    }
  }

  async function handleCloneElement(element: ElementResponse) {
    if (!window.electron) return;
    try {
      const result = await window.electron.createElement({
        uniqueName: element.uniqueName,
        color: element.color,
        color2: element.color2,
        isDualColor: element.isDualColor,
        material: element.material,
        weightGrams: element.weightGrams,
        imageUrl: element.imageUrl ?? undefined,
      });
      if (result.success) {
        loadElements();
      } else {
        alert(result.error || 'Failed to clone element');
      }
    } catch (err) {
      console.error('Failed to clone element:', err);
    }
  }

  function handleElementCreated() {
    setShowCreateElement(false);
    loadElements();
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {elementCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveElementCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeElementCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {filteredElements.length} of {elements.length} elements
          </p>
          <div className="flex gap-2">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={elementSearch}
                onChange={(e) => setElementSearch(e.target.value)}
                placeholder="Search elements..."
                className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <button
              onClick={() => setShowCreateElement(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Element
            </button>
          </div>
        </div>
      </div>

      {/* Elements Grid */}
      {isLoadingElements ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading elements...</div>
        </div>
      ) : filteredElements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {elements.length === 0 ? 'No elements yet' : 'No elements match your filter'}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {elements.length === 0 ? 'Click "Add Element" to create your first element.' : 'Try a different category or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredElements.map(element => (
            <ElementCard
              key={element.id}
              element={element}
              onDelete={handleDeleteElement}
              onClone={handleCloneElement}
              onUpdated={loadElements}
            />
          ))}
        </div>
      )}

      {/* Create Element Modal */}
      {showCreateElement && (
        <CreateElementInlineModal
          onClose={() => setShowCreateElement(false)}
          onCreated={handleElementCreated}
        />
      )}
    </div>
  );
}

// ── Element Card ────────────────────────────────────────────

function ElementCard({
  element,
  onDelete,
  onClone,
  onUpdated,
}: {
  element: ElementResponse;
  onDelete: (id: string) => void;
  onClone: (element: ElementResponse) => void;
  onUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    uniqueName: element.uniqueName,
    label: element.label || '',
    color: element.color,
    color2: element.color2 || '',
    isDualColor: element.isDualColor,
    rawMaterialId: element.rawMaterialId || '',
    weightGrams: element.weightGrams,
    imageUrl: element.imageUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterialResponse[]>([]);

  useEffect(() => {
    if (isEditing && window.electron) {
      window.electron.getRawMaterials().then(r => {
        if (r.success) setAvailableMaterials(r.data);
      });
    }
  }, [isEditing]);

  const selectedMaterial = availableMaterials.find(m => m.id === editForm.rawMaterialId);

  async function handleSave() {
    if (!window.electron) return;
    setIsSaving(true);
    try {
      const result = await window.electron.updateElement(element.id, {
        uniqueName: editForm.uniqueName,
        label: editForm.label || '',
        color: editForm.color,
        color2: editForm.isDualColor && editForm.color2 ? editForm.color2 : null,
        isDualColor: editForm.isDualColor,
        material: selectedMaterial?.name || element.material,
        weightGrams: Number(editForm.weightGrams),
        imageUrl: editForm.imageUrl || null,
        rawMaterialId: editForm.rawMaterialId || null,
      });
      if (result.success) {
        setIsEditing(false);
        onUpdated();
      } else {
        alert(result.error || 'Failed to update');
      }
    } catch {
      alert('Failed to update element');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSelectImage() {
    if (!window.electron) return;
    try {
      const result = await window.electron.selectImage();
      if (result.success && result.data) {
        setEditForm(prev => ({ ...prev, imageUrl: result.data! }));
      }
    } catch { /* ignore */ }
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-blue-400 bg-white p-4 shadow-lg dark:border-blue-600 dark:bg-zinc-900">
        <div className="space-y-3">
          <input type="text" value={editForm.uniqueName} onChange={(e) => setEditForm(prev => ({ ...prev, uniqueName: e.target.value }))} placeholder="Element name" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <input type="text" value={editForm.label} onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Label (optional — groups in production)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <div className="flex gap-2">
            <input type="text" value={editForm.color} onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))} placeholder="Color" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            <div className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(editForm.color) }} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editForm.isDualColor} onChange={(e) => setEditForm(prev => ({ ...prev, isDualColor: e.target.checked }))} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Dual color</span>
          </label>
          {editForm.isDualColor && (
            <div className="flex gap-2">
              <input type="text" value={editForm.color2} onChange={(e) => setEditForm(prev => ({ ...prev, color2: e.target.value }))} placeholder="Second color" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <div className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(editForm.color2) }} />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Raw Material</label>
            {availableMaterials.length > 0 ? (
              <select value={editForm.rawMaterialId} onChange={(e) => setEditForm(prev => ({ ...prev, rawMaterialId: e.target.value }))} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                <option value="">None</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stockQty.toLocaleString()} {m.unit})</option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                No materials. Add them in the Storage tab.
              </p>
            )}
          </div>
          <input type="number" value={editForm.weightGrams} onChange={(e) => setEditForm(prev => ({ ...prev, weightGrams: Number(e.target.value) }))} placeholder="Weight (g)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <button type="button" onClick={handleSelectImage} className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            {editForm.imageUrl ? 'Change Image' : 'Select Image'}
          </button>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isSaving || !editForm.uniqueName || !editForm.color} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setIsEditing(false)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="aspect-square overflow-hidden rounded-t-xl bg-zinc-100 dark:bg-zinc-800">
        {element.imageUrl ? (
          <img src={element.imageUrl} alt={element.uniqueName} className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{element.uniqueName}</h3>
        {element.label && (
          <span className="mt-0.5 inline-block rounded bg-purple-100 px-2 py-0.5 text-sm font-bold uppercase text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
            🏷 {element.label}
          </span>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(element.color) }} title={element.color} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{element.color}</span>
          {element.isDualColor && element.color2 && (
            <>
              <span className="text-xs text-zinc-400">+</span>
              <div className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(element.color2) }} title={element.color2} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{element.color2}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
          <span>{element.material}</span>
          <span>·</span>
          <span>{element.weightGrams}g</span>
          {element.isDualColor && (
            <>
              <span>·</span>
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">Dual</span>
            </>
          )}
        </div>
      </div>
      {/* Actions — visible on hover */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => setIsEditing(true)} className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-blue-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-blue-400" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={() => onClone(element)} className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-green-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-green-400" title="Clone">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button onClick={() => { if (confirm(`Delete "${element.uniqueName}"?`)) onDelete(element.id); }} className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-red-400" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Create Element Inline Modal ─────────────────────────────

function CreateElementInlineModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    uniqueName: '',
    label: '',
    color: '',
    color2: '',
    isDualColor: false,
    rawMaterialId: '',
    weightGrams: 0,
    imageUrl: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterialResponse[]>([]);

  useEffect(() => {
    if (window.electron) {
      window.electron.getRawMaterials().then(r => {
        if (r.success) setAvailableMaterials(r.data);
      });
    }
  }, []);

  const selectedMaterial = availableMaterials.find(m => m.id === form.rawMaterialId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !form.uniqueName || !form.color || !form.rawMaterialId) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.createElement({
        uniqueName: form.uniqueName,
        label: form.label || '',
        color: form.color,
        color2: form.isDualColor && form.color2 ? form.color2 : null,
        isDualColor: form.isDualColor,
        material: selectedMaterial?.name || '',
        weightGrams: Number(form.weightGrams),
        imageUrl: form.imageUrl || undefined,
        rawMaterialId: form.rawMaterialId,
      });
      if (result.success) {
        onCreated();
      } else {
        alert(result.error || 'Failed to create element');
      }
    } catch {
      alert('Failed to create element');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSelectImage() {
    if (!window.electron) return;
    try {
      const result = await window.electron.selectImage();
      if (result.success && result.data) {
        setForm(prev => ({ ...prev, imageUrl: result.data! }));
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Create Element</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={form.uniqueName} onChange={(e) => setForm(prev => ({ ...prev, uniqueName: e.target.value }))} placeholder="Element name (e.g., Bucket, Lid)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
          <input type="text" value={form.label} onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))} placeholder="Label (optional — groups in production)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <div className="flex gap-2">
            <input type="text" value={form.color} onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))} placeholder="Color (e.g., Red)" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required />
            <div className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(form.color) }} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.isDualColor} onChange={(e) => setForm(prev => ({ ...prev, isDualColor: e.target.checked }))} className="rounded border-zinc-300" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Dual color (halves production quantity)</span>
          </label>
          {form.isDualColor && (
            <div className="flex gap-2">
              <input type="text" value={form.color2} onChange={(e) => setForm(prev => ({ ...prev, color2: e.target.value }))} placeholder="Second color" className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
              <div className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(form.color2) }} />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Raw Material <span className="text-red-500">*</span></label>
            {availableMaterials.length > 0 ? (
              <select value={form.rawMaterialId} onChange={(e) => setForm(prev => ({ ...prev, rawMaterialId: e.target.value }))} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required>
                <option value="">Select material...</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stockQty.toLocaleString()} {m.unit})</option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                No raw materials found. Go to the Storage tab to add materials first.
              </p>
            )}
          </div>
          <input type="number" value={form.weightGrams || ''} onChange={(e) => setForm(prev => ({ ...prev, weightGrams: Number(e.target.value) }))} placeholder="Weight in grams" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          <button type="button" onClick={handleSelectImage} className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            {form.imageUrl ? 'Change Image' : 'Select Image (Optional)'}
          </button>
          {form.imageUrl && (
            <div className="flex justify-center">
              <img src={form.imageUrl} alt="Preview" className="h-20 w-20 rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800" />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !form.uniqueName || !form.color || !form.rawMaterialId} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create Element'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
