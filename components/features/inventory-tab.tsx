'use client';

import { useState, useEffect, memo } from 'react';
import type { InventoryResponse, AssemblyOrderData, ExcessAssemblyData, ElementResponse } from '../../types/ipc';
import { colorNameToHex } from '../../lib/utils';
import { printAssemblySheet } from '../../lib/print-assembly';
import { useI18n } from '../../lib/i18n';
import { toast } from '../ui/toast';

export default function InventoryTab() {
  const [inventory, setInventory] = useState<InventoryResponse[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [assemblyOrders, setAssemblyOrders] = useState<AssemblyOrderData[]>([]);
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(true);
  const [excessItems, setExcessItems] = useState<ExcessAssemblyData[]>([]);
  const [isLoadingExcess, setIsLoadingExcess] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [allElements, setAllElements] = useState<ElementResponse[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    void Promise.all([loadInventory(true), loadAssemblyOrders(true), loadExcess(true), loadElements()]);
  }, []);

  async function loadInventory(initial = false) {
    if (!window.electron) { setIsLoadingInventory(false); return; }
    if (initial) setIsLoadingInventory(true);
    try {
      const result = await window.electron.getInventory();
      if (result.success) {
        setInventory(result.data.filter((item: InventoryResponse) => item.totalAmount > 0));
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      if (initial) setIsLoadingInventory(false);
    }
  }

  async function handleDeleteInventory(id: string) {
    if (!window.electron || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await window.electron.deleteInventory(id);
      if (result.success) {
        setInventory(prev => prev.filter(item => item.id !== id));
      } else {
        toast(result.error || 'Failed to delete inventory item');
      }
    } catch (err) {
      console.error('Failed to delete inventory:', err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function loadAssemblyOrders(initial = false) {
    if (!window.electron) { setIsLoadingAssembly(false); return; }
    if (initial) setIsLoadingAssembly(true);
    try {
      const result = await window.electron.getAssemblyOrders();
      if (result.success) setAssemblyOrders(result.data);
    } catch (err) {
      console.error('Failed to load assembly orders:', err);
    } finally {
      if (initial) setIsLoadingAssembly(false);
    }
  }

  async function loadExcess(initial = false) {
    if (!window.electron) { setIsLoadingExcess(false); return; }
    if (initial) setIsLoadingExcess(true);
    try {
      const result = await window.electron.getExcessAssembly();
      if (result.success) setExcessItems(result.data);
    } catch (err) {
      console.error('Failed to load excess assembly:', err);
    } finally {
      if (initial) setIsLoadingExcess(false);
    }
  }

  async function loadElements() {
    if (!window.electron) return;
    try {
      const result = await window.electron.getElements();
      if (result.success) setAllElements(result.data);
    } catch (err) {
      console.error('Failed to load elements:', err);
    }
  }

  async function handleManualAddInventory(elementId: string, quantity: number): Promise<string | true> {
    if (!window.electron) return 'Not available';
    try {
      const result = await window.electron.adjustInventory({
        elementId,
        changeAmount: quantity,
        reason: 'Manual addition',
      });
      if (result.success) {
        loadInventory();
        return true;
      }
      return result.error || 'Failed to add inventory';
    } catch (err) {
      console.error('Failed to add inventory:', err);
      return 'Failed to add inventory';
    }
  }

  async function handleRecordAssembly(orderId: string, productId: string, boxes: number): Promise<string | true> {
    if (!window.electron) return 'Not available';
    try {
      const result = await window.electron.recordAssembly({ orderId, productId, boxesAssembled: boxes });
      if (result.success) {
        // Batch all refetches into a single await to minimize re-renders
        await Promise.all([loadInventory(), loadExcess(), loadAssemblyOrders()]);
        return true;
      }
      return result.error || 'Failed to record assembly';
    } catch (err) {
      console.error('Failed to record assembly:', err);
      return 'Failed to record assembly';
    }
  }

  async function handleRecordExcessAssembly(productId: string, boxes: number): Promise<string | true> {
    if (!window.electron) return 'Not available';
    try {
      const result = await window.electron.recordExcessAssembly({ productId, boxes });
      if (result.success) {
        await Promise.all([loadInventory(), loadExcess()]);
        return true;
      }
      return result.error || 'Failed to record excess assembly';
    } catch (err) {
      console.error('Failed to record excess assembly:', err);
      return 'Failed to record excess assembly';
    }
  }

  function refreshAll() {
    Promise.all([loadInventory(), loadAssemblyOrders(), loadExcess()]);
  }

  return (
    <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
      {/* LEFT: Element Inventory */}
      <div className="flex-1 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('inventory.title')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('inventory.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddInventory(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('inventory.addManual')}
            </button>
            <button onClick={() => loadInventory()} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.refresh')}</button>
          </div>
        </div>

        {isLoadingInventory ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('inventory.noElements')}</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{t('inventory.noElementsHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inventory.map(item => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                  {item.element?.imageUrl ? (
                    <img src={item.element.imageUrl} alt={item.element?.uniqueName} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.element?.uniqueName ?? 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(item.element?.color || '') }} title={item.element?.color} />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.element?.color ?? 'Unknown'}</span>
                    {item.element?.color2 && (
                      <>
                        <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" style={{ backgroundColor: colorNameToHex(item.element.color2) }} title={item.element.color2} />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.element.color2}</span>
                      </>
                    )}
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="text-xs text-zinc-400">{item.element?.material ?? ''}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{item.totalAmount}</p>
                  <p className="text-xs text-zinc-400">{t('common.inStock')}</p>
                </div>
                <button
                  onClick={() => handleDeleteInventory(item.id)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
                  title="Delete inventory (testing)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Assembly + Excess */}
      <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-zinc-100/50 dark:bg-zinc-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('inventory.assembly')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('inventory.assemblySubtitle')}</p>
          </div>
          <button onClick={refreshAll} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.refresh')}</button>
        </div>

        {isLoadingAssembly ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
          </div>
        ) : assemblyOrders.length === 0 && excessItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('inventory.noOrdersInProduction')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assemblyOrders.map(order => (
              <AssemblyOrderCard key={order.orderId} order={order} onRecordAssembly={handleRecordAssembly} excessItems={excessItems} onPrintAssembly={printAssemblySheet} />
            ))}

            {/* Excess Assembly Card */}
            {!isLoadingExcess && excessItems.length > 0 && (
              <ExcessAssemblyCard items={excessItems} onRecordExcess={handleRecordExcessAssembly} />
            )}
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      {showAddInventory && (
        <AddInventoryModal
          elements={allElements}
          onClose={() => setShowAddInventory(false)}
          onAdded={(elementId, quantity) => {
            handleManualAddInventory(elementId, quantity).then(result => {
              if (result === true) {
                setShowAddInventory(false);
              } else {
                toast(result);
              }
            });
          }}
        />
      )}
    </div>
  );
}

// ── Add Inventory Modal ─────────────────────────────────────

function AddInventoryModal({
  elements,
  onClose,
  onAdded,
}: {
  elements: ElementResponse[];
  onClose: () => void;
  onAdded: (elementId: string, quantity: number) => void;
}) {
  const [selectedElementId, setSelectedElementId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [elementSearch, setElementSearch] = useState('');
  const { t } = useI18n();

  const filteredElements = elements.filter(e => {
    if (!elementSearch.trim()) return true;
    const q = elementSearch.trim().toLowerCase();
    return e.uniqueName.toLowerCase().includes(q) || e.color.toLowerCase().includes(q);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedElementId) { setError(t('inventory.selectElement')); return; }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) { setError(t('inventory.validQuantity')); return; }
    setError('');
    onAdded(selectedElementId, qty);
  }

  const selectedElement = elements.find(e => e.id === selectedElementId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('inventory.addManual')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Element search and select */}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('inventory.element')}</label>
            <input
              type="text"
              value={elementSearch}
              onChange={(e) => setElementSearch(e.target.value)}
              placeholder={t('inventory.searchElement')}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 mb-2"
            />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              {filteredElements.length === 0 ? (
                <p className="px-3 py-2 text-xs text-zinc-400">{t('inventory.noElementsMatch')}</p>
              ) : (
                filteredElements.map(el => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => { setSelectedElementId(el.id); setError(''); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      selectedElementId === el.id
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div
                      className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                      style={{ backgroundColor: colorNameToHex(el.color) }}
                    />
                    <span className="truncate">{el.uniqueName}</span>
                    <span className="ml-auto text-xs text-zinc-400">{el.color}</span>
                  </button>
                ))
              )}
            </div>
            {selectedElement && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                {t('inventory.selected')}: {selectedElement.uniqueName} ({selectedElement.color})
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('inventory.quantity')}</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(''); }}
              placeholder={t('inventory.enterQuantity')}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!selectedElementId || !quantity}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {t('inventory.addToInventory')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assembly Order Card ─────────────────────────────────────

const AssemblyOrderCard = memo(function AssemblyOrderCard({
  order,
  onRecordAssembly,
  excessItems,
  onPrintAssembly,
}: {
  order: AssemblyOrderData;
  onRecordAssembly: (orderId: string, productId: string, boxes: number) => Promise<string | true>;
  excessItems: ExcessAssemblyData[];
  onPrintAssembly: (orderId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Order #{order.orderNumber}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPrintAssembly(order.orderId)}
            className="rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            title="Print assembly sheet"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">In Production</span>
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {order.products.map(product => {
          const excess = excessItems.find(e => e.productId === product.productId);
          return (
            <div key={product.orderItemId}>
              <AssemblyProductRow product={product} orderId={order.orderId} onRecordAssembly={onRecordAssembly} />
              {excess && excess.excessBoxes > 0 && (
                <div className="mx-4 mb-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Inventory can assemble <strong>{excess.excessBoxes}</strong> extra box{excess.excessBoxes !== 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Assembly Product Row ────────────────────────────────────

const AssemblyProductRow = memo(function AssemblyProductRow({
  product,
  orderId,
  onRecordAssembly,
}: {
  product: AssemblyOrderData['products'][0];
  orderId: string;
  onRecordAssembly: (orderId: string, productId: string, boxes: number) => Promise<string | true>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localAssembled, setLocalAssembled] = useState(product.boxesAssembled);
  const localRemaining = product.boxesNeeded - localAssembled;
  const isDone = localRemaining <= 0;
  const progress = product.boxesNeeded > 0 ? Math.min(100, (localAssembled / product.boxesNeeded) * 100) : 0;

  async function handleSubmit() {
    const amount = parseInt(inputValue, 10);
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid number'); return; }
    if (amount > localRemaining) { setError(`Max: ${localRemaining}`); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await onRecordAssembly(orderId, product.productId, amount);
      if (result === true) { setLocalAssembled(prev => prev + amount); setInputValue(''); setError(''); }
      else { setError(result); setInputValue(''); }
    } catch { setError('Failed'); setInputValue(''); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.serialNumber} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{product.serialNumber}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{localAssembled}</span>
            <span className="text-lg text-zinc-400">/</span>
            <span className="text-2xl font-bold tabular-nums text-zinc-500 dark:text-zinc-400">{product.boxesNeeded}</span>
            <span className="text-xs text-zinc-400">boxes</span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="mt-2 pl-[68px]">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1">
            Inventory can make <strong className="text-zinc-600 dark:text-zinc-300">{product.maxAssemblable ?? 0}</strong> box{(product.maxAssemblable ?? 0) !== 1 ? 'es' : ''}
          </p>
          <div className="flex items-center gap-2">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={inputValue} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setInputValue(v); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder={`Add (max ${localRemaining})`} className="w-32 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
            <button onClick={handleSubmit} disabled={isSubmitting || !inputValue} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? '...' : 'Add'}
            </button>
          </div>
          {error && <p className="mt-1 text-xs text-red-500 break-words max-w-[280px]">{error}</p>}
        </div>
      )}

      {isDone && (
        <div className="mt-2 flex items-center gap-1 pl-[68px] text-sm font-medium text-green-600 dark:text-green-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Complete
        </div>
      )}
    </div>
  );
});

// ── Excess Assembly Card ────────────────────────────────────

const ExcessAssemblyCard = memo(function ExcessAssemblyCard({
  items,
  onRecordExcess,
}: {
  items: ExcessAssemblyData[];
  onRecordExcess: (productId: string, boxes: number) => Promise<string | true>;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2.5 dark:border-amber-900/50">
        <div>
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">{t('inventory.excessAssembly')}</h3>
          <p className="text-xs text-amber-600 dark:text-amber-500">{t('inventory.excessSubtitle')}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          {items.length} product{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
        {items.map(item => (
          <ExcessProductRow key={item.productId} item={item} onRecordExcess={onRecordExcess} />
        ))}
      </div>
    </div>
  );
});

// ── Excess Product Row ──────────────────────────────────────

const ExcessProductRow = memo(function ExcessProductRow({
  item,
  onRecordExcess,
}: {
  item: ExcessAssemblyData;
  onRecordExcess: (productId: string, boxes: number) => Promise<string | true>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { t } = useI18n();

  async function handleSubmit() {
    if (item.locked) return;
    const amount = parseInt(inputValue, 10);
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid number'); return; }
    if (amount > item.excessBoxes) { setError(`Max: ${item.excessBoxes}`); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await onRecordExcess(item.productId, amount);
      if (result === true) { setInputValue(''); setError(''); }
      else { setError(result); setInputValue(''); }
    } catch { setError('Failed'); setInputValue(''); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className={`px-4 py-3 ${item.locked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white dark:bg-zinc-700">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.serialNumber} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.serialNumber}</p>
          {item.label && (
            <span className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 mt-0.5">{item.label}</span>
          )}
          {item.locked ? (
            <div className="flex items-center gap-1 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('inventory.finishOrdersFirst')} ({item.excessBoxes} box{item.excessBoxes !== 1 ? 'es' : ''} possible)</p>
            </div>
          ) : (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
              {t('inventory.canAssemble')} {item.excessBoxes} {item.excessBoxes !== 1 ? t('common.boxes') : t('common.box')}
            </p>
          )}
        </div>
      </div>
      {!item.locked && (
        <>
        <div className="mt-2 flex items-center gap-2 pl-[60px]">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={`Add (max ${item.excessBoxes})`}
            className="w-32 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button onClick={handleSubmit} disabled={isSubmitting || !inputValue} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? '...' : 'Add'}
          </button>
        </div>
        {error && <p className="mt-1 pl-[60px] text-xs text-red-500 break-words max-w-[320px]">{error}</p>}
        </>
      )}
    </div>
  );
});
