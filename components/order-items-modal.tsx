'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ProductResponse } from '../types/ipc';
import { useI18n } from '../lib/i18n';

interface OrderItemEntry {
  productId: string;
  product: ProductResponse;
  boxesNeeded: number;
}

interface OrderItemsModalProps {
  isOpen: boolean;
  orderId: string | null;
  orderNumber: number;
  onClose: () => void;
  onDone: () => void;
}

export default function OrderItemsModal({
  isOpen, orderId, orderNumber, onClose, onDone,
}: OrderItemsModalProps) {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');

  // Items added to this order
  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([]);

  // Selection state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [boxesInput, setBoxesInput] = useState('1');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Load products
  useEffect(() => {
    if (!isOpen) return;
    setOrderItems([]);
    setSelectedProductId(null);
    setBoxesInput('1');
    setSearch('');
    setError('');
    loadProducts();
  }, [isOpen]);

  async function loadProducts() {
    if (!window.electron) return;
    setIsLoadingProducts(true);
    try {
      const result = await window.electron.getProducts();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(p =>
      p.serialNumber.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  function handleSelectProduct(productId: string) {
    setSelectedProductId(productId === selectedProductId ? null : productId);
    setBoxesInput('1');
    setError('');
  }

  async function handleAddItem() {
    if (!selectedProductId || !orderId) return;
    const boxes = parseInt(boxesInput, 10);
    if (isNaN(boxes) || boxes < 1) {
      setError('Enter a valid number of boxes (≥ 1).');
      return;
    }

    // Check duplicate
    if (orderItems.some(item => item.productId === selectedProductId)) {
      setError('This product is already added to the order.');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setError('');
    setIsSaving(true);

    try {
      // We don't save individual items yet — we batch on finalize
      setOrderItems(prev => [...prev, { productId: selectedProductId, product, boxesNeeded: boxes }]);
      setSelectedProductId(null);
      setBoxesInput('1');
    } finally {
      setIsSaving(false);
    }
  }

  function handleRemoveItem(productId: string) {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  }

  async function handleFinalize() {
    if (!orderId || orderItems.length === 0) return;
    if (!window.electron) return;

    setIsFinalizing(true);
    setError('');

    try {
      // Delete the empty order and recreate with items
      // Actually, we need to just add items. Let's update the order by deleting and recreating
      // Or better: delete existing order, create new one with items
      // The order was already created without items. Let's delete it and create a fresh one with items.

      // First, get the original order to retrieve clientName, status, notes
      const orderResult = await window.electron.getOrderById(orderId);
      if (!orderResult.success || !orderResult.data) {
        setError('Failed to retrieve order details.');
        setIsFinalizing(false);
        return;
      }

      const originalOrder = orderResult.data;

      // Delete the empty order
      await window.electron.deleteOrder(orderId);

      // Re-create with items
      const createResult = await window.electron.createOrder({
        clientName: originalOrder.clientName,
        status: originalOrder.status as 'pending' | 'in_production',
        notes: originalOrder.notes || undefined,
        items: orderItems.map(item => ({
          productId: item.productId,
          boxesNeeded: item.boxesNeeded,
        })),
      });

      if (createResult.success) {
        onDone();
      } else {
        setError(createResult.error || 'Failed to finalize order.');
      }
    } catch (err) {
      setError('Failed to finalize order.');
      console.error(err);
    } finally {
      setIsFinalizing(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !orderId) return null;

  const selectedProduct = selectedProductId ? products.find(p => p.id === selectedProductId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex w-full max-w-2xl max-h-[85vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('orders.addProducts')} — #{orderNumber}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {t('orders.selectProducts')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Error */}
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Added Items Summary */}
          {orderItems.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t('orderItems.addedProducts')} ({orderItems.length})
              </h3>
              <div className="space-y-2">
                {orderItems.map(item => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    {/* Mini thumbnail */}
                    <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-700">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.serialNumber} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.product.serialNumber}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.boxesNeeded} box{item.boxesNeeded !== 1 ? 'es' : ''}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="rounded-md p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Products */}
          <div className="mb-3">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('orderItems.searchPlaceholder')}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Product List (Landscape Cards) */}
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-10">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{t('orderItems.loadingProducts')}</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {products.length === 0 ? t('orderItems.noProducts') : t('orderItems.noMatch')}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => {
                const isSelected = selectedProductId === product.id;
                const isAdded = orderItems.some(item => item.productId === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => !isAdded && handleSelectProduct(product.id)}
                    disabled={isAdded}
                    className={`flex w-full items-center gap-4 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      isAdded
                        ? 'border-green-300 bg-green-50/50 opacity-60 cursor-not-allowed dark:border-green-800 dark:bg-green-950/20'
                        : isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/30'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750'
                    }`}
                  >
                    {/* Product Image (left side — landscape layout) */}
                    <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-700">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.serialNumber}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Serial Number (right side) */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {product.serialNumber}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {product.category} · {product.unitsPerBox}u/box
                      </p>
                    </div>

                    {/* Status indicator */}
                    {isAdded && (
                      <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/50 dark:text-green-400">
                        {t('orders.added')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Boxes Input (when a product is selected) */}
          {selectedProduct && (
            <div className="mt-3 flex items-end gap-3 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {t('orderItems.boxesOf')} <span className="font-semibold">{selectedProduct.serialNumber}</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={boxesInput}
                  onChange={(e) => setBoxesInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  autoFocus
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  = {(parseInt(boxesInput, 10) || 0) * selectedProduct.unitsPerBox} {t('orders.unitsTotal')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={isSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? t('orderItems.adding') : t('orders.addToOrder')}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {orderItems.length} {t('orders.products')} {t('orders.itemsInOrder')}
          </p>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isFinalizing || orderItems.length === 0}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFinalizing ? t('orders.finalizing') : t('orders.finalize')}
          </button>
        </div>
      </div>
    </div>
  );
}
