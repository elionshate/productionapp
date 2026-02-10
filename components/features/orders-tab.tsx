'use client';

import { useState, useEffect, useMemo } from 'react';
import OrderCard from '../order-card';
import CreateOrderModal from '../create-order-modal';
import OrderItemsModal from '../order-items-modal';
import OrderDetailModal from '../order-detail-modal';
import type { OrderResponse } from '../../types/ipc';
import { useI18n } from '../../lib/i18n';

export default function OrdersTab() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [orderItemsModal, setOrderItemsModal] = useState<{ orderId: string; orderNumber: number } | null>(null);
  const [orderDetailModal, setOrderDetailModal] = useState<OrderResponse | null>(null);
  const [editOrderModal, setEditOrderModal] = useState<OrderResponse | null>(null);
  const { t } = useI18n();

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (orderStatusFilter !== 'All') {
      filtered = filtered.filter(o => o.status === orderStatusFilter);
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase();
      filtered = filtered.filter(o =>
        o.clientName.toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q)
      );
    }
    return filtered;
  }, [orders, orderStatusFilter, orderSearch]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    if (!window.electron) { setIsLoadingOrders(false); return; }
    setIsLoadingOrders(true);
    try {
      const result = await window.electron.getOrders();
      if (result.success) setOrders(result.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  function handleOrderCreated(order: { id: string; orderNumber: number; clientName: string }) {
    setShowCreateOrder(false);
    setOrderItemsModal({ orderId: order.id, orderNumber: order.orderNumber });
  }

  async function handleOrderItemsDone() {
    setOrderItemsModal(null);
    await loadOrders();
  }

  async function handleStartProduction(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.updateOrder(id, { status: 'in_production' });
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'in_production' } : o));
        // Show auto-deduction feedback if stock was applied
        const items = result.data.orderItems ?? [];
        const applied = items.filter(i => i.boxesAssembled && i.boxesAssembled > 0);
        if (applied.length > 0) {
          const details = applied.map(i => `${i.product?.serialNumber ?? 'Product'}: ${i.boxesAssembled} box${i.boxesAssembled !== 1 ? 'es' : ''} from stock`).join('\n');
          alert(`Stock auto-applied:\n${details}`);
        }
      } else {
        alert(result.error || 'Cannot start production');
        await loadOrders();
      }
    } catch (err) {
      console.error('Failed to start production:', err);
    }
  }

  async function handleShipOrder(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.updateOrder(id, { status: 'shipped' });
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped', shippedAt: new Date() } : o));
      } else {
        alert(result.error || 'Cannot ship order');
      }
    } catch (err) {
      console.error('Failed to ship order:', err);
    }
  }

  async function handleDeleteOrder(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteOrder(id);
      if (result.success) {
        setOrders(prev => prev.filter(o => o.id !== id));
      } else {
        alert(result.error || 'Failed to delete order');
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      throw err;
    }
  }

  async function handleOrderClick(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.getOrderById(id);
      if (result.success && result.data) {
        setOrderDetailModal(result.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'pending', 'in_production', 'shipped'].map(status => {
            const labels: Record<string, string> = { All: t('common.all'), pending: t('orders.pending'), in_production: t('orders.inProduction'), shipped: t('orders.shipped') };
            const count = status === 'All' ? orders.length : orders.filter(o => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setOrderStatusFilter(status)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  orderStatusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {labels[status]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('orders.newOrder')}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoadingOrders ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {orders.length === 0 ? t('orders.noOrders') : t('orders.noMatch')}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {orders.length === 0 ? t('orders.noOrdersHint') : t('orders.noMatchHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStartProduction={handleStartProduction}
              onShip={handleShipOrder}
              onDelete={handleDeleteOrder}
              onClick={handleOrderClick}
              onEdit={(o) => {
                if (o.status === 'shipped') return;
                setEditOrderModal(o);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateOrderModal
        isOpen={showCreateOrder}
        onClose={() => setShowCreateOrder(false)}
        onCreated={handleOrderCreated}
      />

      <OrderItemsModal
        isOpen={!!orderItemsModal}
        orderId={orderItemsModal?.orderId || null}
        orderNumber={orderItemsModal?.orderNumber || 0}
        onClose={() => { setOrderItemsModal(null); loadOrders(); }}
        onDone={handleOrderItemsDone}
      />

      <OrderDetailModal
        isOpen={!!orderDetailModal}
        order={orderDetailModal}
        onClose={() => setOrderDetailModal(null)}
      />

      {editOrderModal && (
        <EditOrderModal
          order={editOrderModal}
          onClose={() => setEditOrderModal(null)}
          onSaved={() => { setEditOrderModal(null); loadOrders(); }}
        />
      )}
    </div>
  );
}

// ── Edit Order Modal ────────────────────────────────────────

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: OrderResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(order.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<import('../../types/ipc').OrderItemResponse[]>([]);
  const [products, setProducts] = useState<import('../../types/ipc').ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [boxesInput, setBoxesInput] = useState('1');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { t } = useI18n();

  // Load full order details + products on mount
  useEffect(() => {
    loadOrderDetails();
  }, []);

  async function loadOrderDetails() {
    if (!window.electron) return;
    setIsLoading(true);
    try {
      const [orderResult, productsResult] = await Promise.all([
        window.electron.getOrderById(order.id),
        window.electron.getProducts(),
      ]);
      if (orderResult.success && orderResult.data) {
        setOrderItems(orderResult.data.orderItems ?? []);
        setNotes(orderResult.data.notes || '');
      }
      if (productsResult.success) {
        setProducts(productsResult.data);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Products available to add (not already in order)
  const availableProducts = useMemo(() => {
    const existingIds = new Set(orderItems.map(i => i.productId));
    let filtered = products.filter(p => !existingIds.has(p.id));
    if (productSearch.trim()) {
      const q = productSearch.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.serialNumber.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, orderItems, productSearch]);

  async function handleSaveNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateOrder(order.id, { notes });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || 'Failed to update order');
      }
    } catch {
      alert('Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.removeOrderItem(itemId);
      if (result.success) {
        setOrderItems(result.data.orderItems ?? []);
      } else {
        alert(result.error || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  }

  async function handleUpdateBoxes(itemId: string, newBoxes: number) {
    if (!window.electron || newBoxes < 1) return;
    try {
      const result = await window.electron.updateOrderItem(itemId, { boxesNeeded: newBoxes });
      if (result.success) {
        setOrderItems(result.data.orderItems ?? []);
      } else {
        alert(result.error || 'Failed to update item');
      }
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  }

  async function handleAddProduct() {
    if (!window.electron || !selectedProductId) return;
    const boxes = parseInt(boxesInput, 10);
    if (isNaN(boxes) || boxes < 1) {
      setAddError('Enter a valid number of boxes (≥ 1).');
      return;
    }
    setAddError('');
    setIsAdding(true);
    try {
      const result = await window.electron.addOrderItem(order.id, {
        productId: selectedProductId,
        boxesNeeded: boxes,
      });
      if (result.success) {
        setOrderItems(result.data.orderItems ?? []);
        setSelectedProductId(null);
        setBoxesInput('1');
        setShowAddProduct(false);
      } else {
        setAddError(result.error || 'Failed to add product');
      }
    } catch (err) {
      console.error('Failed to add product:', err);
      setAddError('Failed to add product');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('orders.editOrder')}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Order #{order.orderNumber} — {order.clientName}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
            </div>
          ) : (
            <>
              {/* Current Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    {t('orders.products')} ({orderItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(!showAddProduct)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('orders.addProducts')}
                  </button>
                </div>

                {orderItems.length === 0 ? (
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 italic py-3">No products in this order yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        {/* Product image */}
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.serialNumber}
                            className="h-10 w-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {item.product?.serialNumber || 'Unknown'}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.product?.category}
                          </p>
                        </div>

                        {/* Boxes input */}
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t('orders.boxesNeeded')}:</label>
                          <input
                            type="number"
                            min={1}
                            value={item.boxesNeeded}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1) {
                                handleUpdateBoxes(item.id, val);
                              }
                            }}
                            className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                          />
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                          title={t('common.delete')}
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

              {/* Add Product Section */}
              {showAddProduct && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">{t('orders.addProducts')}</h4>

                  {/* Search */}
                  <div className="relative mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder={t('common.search')}
                      className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  {/* Product list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 mb-3">
                    {availableProducts.length === 0 ? (
                      <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-3">No products available to add.</p>
                    ) : (
                      availableProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductId(product.id === selectedProductId ? null : product.id);
                            setAddError('');
                          }}
                          className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                            selectedProductId === product.id
                              ? 'border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30'
                              : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750'
                          }`}
                        >
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.serialNumber} className="h-8 w-8 rounded-md object-cover bg-zinc-200 dark:bg-zinc-700" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{product.serialNumber}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{product.category}</p>
                          </div>
                          {selectedProductId === product.id && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Boxes input + Add button */}
                  {selectedProductId && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{t('orders.boxesNeeded')}:</label>
                      <input
                        type="number"
                        min={1}
                        value={boxesInput}
                        onChange={(e) => setBoxesInput(e.target.value)}
                        className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        disabled={isAdding}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isAdding ? t('common.loading') : t('orders.addToOrder')}
                      </button>
                    </div>
                  )}

                  {addError && (
                    <p className="mt-2 text-xs text-red-500">{addError}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">{t('orders.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('orders.notes')}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSubmitting || isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
