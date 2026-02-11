'use client';

import { useState, useEffect, useMemo } from 'react';
import type { RawMaterialResponse } from '../../types/ipc';
import { useI18n } from '../../lib/i18n';
import { useDebouncedValue } from '../../hooks/use-debounce';
import { toast } from '../ui/toast';

export default function StorageTab() {
  const { t } = useI18n();
  const [rawMaterials, setRawMaterials] = useState<RawMaterialResponse[]>([]);
  const [isLoadingRawMaterials, setIsLoadingRawMaterials] = useState(true);
  const [showCreateRawMaterial, setShowCreateRawMaterial] = useState(false);
  const [rawMaterialSearch, setRawMaterialSearch] = useState('');
  const debouncedSearch = useDebouncedValue(rawMaterialSearch, 300);
  const [adjustStockModal, setAdjustStockModal] = useState<RawMaterialResponse | null>(null);
  const [editRawMaterialModal, setEditRawMaterialModal] = useState<RawMaterialResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRawMaterials = useMemo(() => {
    if (!debouncedSearch.trim()) return rawMaterials;
    const q = debouncedSearch.trim().toLowerCase();
    return rawMaterials.filter(m => m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q));
  }, [rawMaterials, debouncedSearch]);

  useEffect(() => {
    loadRawMaterials(true);
  }, []);

  async function loadRawMaterials(initial = false) {
    if (!window.electron) { setIsLoadingRawMaterials(false); return; }
    if (initial) setIsLoadingRawMaterials(true);
    try {
      const result = await window.electron.getRawMaterials();
      if (result.success) setRawMaterials(result.data);
    } catch (err) {
      console.error('Failed to load raw materials:', err);
    } finally {
      if (initial) setIsLoadingRawMaterials(false);
    }
  }

  async function handleDeleteRawMaterial(id: string) {
    if (!window.electron || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await window.electron.deleteRawMaterial(id);
      if (result.success) {
        setRawMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        toast(result.error || 'Failed to delete raw material');
      }
    } catch {
      toast('Failed to delete raw material');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('storage.rawMaterials')}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage raw material stock levels. Materials are consumed during production and assembly.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={rawMaterialSearch} onChange={(e) => setRawMaterialSearch(e.target.value)} placeholder={t('common.search') + '...'} className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          </div>
          <button onClick={() => setShowCreateRawMaterial(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Material
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoadingRawMaterials ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
        </div>
      ) : filteredRawMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {rawMaterials.length === 0 ? 'No raw materials yet' : 'No materials match your search'}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {rawMaterials.length === 0 ? 'Click "Add Material" to add your first raw material.' : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRawMaterials.map(material => (
            <RawMaterialCard
              key={material.id}
              material={material}
              onAdjustStock={() => setAdjustStockModal(material)}
              onEdit={() => setEditRawMaterialModal(material)}
              onDelete={() => handleDeleteRawMaterial(material.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateRawMaterial && (
        <CreateRawMaterialModal onClose={() => setShowCreateRawMaterial(false)} onCreated={() => { setShowCreateRawMaterial(false); loadRawMaterials(); }} />
      )}
      {adjustStockModal && (
        <AdjustStockModal material={adjustStockModal} onClose={() => setAdjustStockModal(null)} onAdjusted={() => { setAdjustStockModal(null); loadRawMaterials(); }} />
      )}
      {editRawMaterialModal && (
        <EditRawMaterialModal material={editRawMaterialModal} onClose={() => setEditRawMaterialModal(null)} onSaved={() => { setEditRawMaterialModal(null); loadRawMaterials(); }} />
      )}
    </div>
  );
}

// ── Raw Material Card ───────────────────────────────────────

function RawMaterialCard({
  material, onAdjustStock, onEdit, onDelete,
}: {
  material: RawMaterialResponse; onAdjustStock: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const stockColor = material.stockQty <= 0 ? 'text-red-600 dark:text-red-400' : material.stockQty < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{material.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Unit: {material.unit}</p>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Current Stock</p>
        <p className={`text-2xl font-bold ${stockColor}`}>
          {material.stockQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="ml-1 text-sm font-normal text-zinc-400">{material.unit}</span>
        </p>
      </div>
      <button onClick={onAdjustStock} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
        Adjust Stock
      </button>
    </div>
  );
}

// ── Create Raw Material Modal ───────────────────────────────

function CreateRawMaterialModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.createRawMaterial({ name: name.trim(), unit: unit.trim() || 'g' });
      if (result.success) onCreated();
      else toast(result.error || 'Failed to create raw material');
    } catch { toast('Failed to create raw material'); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Add Raw Material</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Material name (e.g., PVC, PP, Cardboard Box A)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required autoFocus />
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Unit of measurement</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="units">Units</option>
              <option value="meters">Meters</option>
              <option value="liters">Liters</option>
              <option value="sheets">Sheets</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !name.trim()} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Add Material'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Adjust Stock Modal ──────────────────────────────────────

function AdjustStockModal({ material, onClose, onAdjusted }: { material: RawMaterialResponse; onClose: () => void; onAdjusted: () => void }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !amount) return;
    const numAmount = Number(amount);
    if (numAmount <= 0) return;
    const changeAmount = mode === 'add' ? numAmount : -numAmount;
    setIsSubmitting(true);
    try {
      const result = await window.electron.adjustRawMaterialStock({ rawMaterialId: material.id, changeAmount, reason: reason.trim() || undefined });
      if (result.success) onAdjusted();
      else toast(result.error || 'Failed to adjust stock');
    } catch { toast('Failed to adjust stock'); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Adjust Stock</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {material.name} — Current: {material.stockQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {material.unit}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <button type="button" onClick={() => setMode('add')} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'add' ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400'}`}>+ Add Stock</button>
            <button type="button" onClick={() => setMode('remove')} className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'remove' ? 'bg-red-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400'}`}>- Remove Stock</button>
          </div>
          <div className="relative">
            <input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Amount in ${material.unit}`} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required autoFocus />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{material.unit}</span>
          </div>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional — e.g., Shipment received)" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
          {amount && Number(amount) > 0 && (
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                New stock will be:{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {(material.stockQty + (mode === 'add' ? Number(amount) : -Number(amount))).toLocaleString(undefined, { maximumFractionDigits: 2 })} {material.unit}
                </span>
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !amount || Number(amount) <= 0} className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {isSubmitting ? 'Adjusting...' : mode === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Raw Material Modal ─────────────────────────────────

function EditRawMaterialModal({ material, onClose, onSaved }: { material: RawMaterialResponse; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(material.name);
  const [unit, setUnit] = useState(material.unit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateRawMaterial(material.id, { name: name.trim(), unit: unit.trim() });
      if (result.success) onSaved();
      else toast(result.error || 'Failed to update raw material');
    } catch { toast('Failed to update raw material'); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Raw Material</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Material name" className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required autoFocus />
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Unit of measurement</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="units">Units</option>
              <option value="meters">Meters</option>
              <option value="liters">Liters</option>
              <option value="sheets">Sheets</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSubmitting || !name.trim()} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : t('common.save')}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
