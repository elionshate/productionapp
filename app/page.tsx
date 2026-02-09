'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/use-auth';
import ProductCard from '../components/product-card';
import CreateProductModal from '../components/create-product-modal';
import ProductElementsModal from '../components/product-elements-modal';
import OrderCard from '../components/order-card';
import CreateOrderModal from '../components/create-order-modal';
import OrderItemsModal from '../components/order-items-modal';
import OrderDetailModal from '../components/order-detail-modal';
import ProductionOrderCard from '../components/production-order-card';
import type {
  ProductResponse,
  OrderResponse,
  ProductionOrderData,
  InventoryResponse,
  AssemblyOrderData,
  StockOrderData,
} from '../types/ipc';
import { colorNameToHex } from '../lib/utils';

// Main navigation tabs
const NAV_TABS = ['Products', 'Orders', 'Inventory', 'Production', 'Stock'] as const;
type NavTab = (typeof NAV_TABS)[number];

export default function Home() {
  const { user, logout } = useAuth();

  // Navigation
  const [activeNav, setActiveNav] = useState<NavTab>('Products');

  // Products data
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch app version + subscribe to update events on mount
  useEffect(() => {
    if (!window.electron) return;
    window.electron.getAppVersion().then(v => setAppVersion(v));
    const unsub = window.electron.onUpdateStatus((data) => {
      setUpdateStatus(data);
    });
    return unsub;
  }, []);

  // Category filter
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Search
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [elementsModal, setElementsModal] = useState<{ productId: string; productName: string } | null>(null);

  // ===== ORDERS STATE =====
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [orderItemsModal, setOrderItemsModal] = useState<{ orderId: string; orderNumber: number } | null>(null);
  const [orderDetailModal, setOrderDetailModal] = useState<OrderResponse | null>(null);

  // ===== PRODUCTION STATE =====
  const [productionOrders, setProductionOrders] = useState<ProductionOrderData[]>([]);
  const [isLoadingProduction, setIsLoadingProduction] = useState(true);

  // ===== INVENTORY STATE =====
  const [inventory, setInventory] = useState<InventoryResponse[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  // ===== AUTO-UPDATE STATE =====
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; error?: string } | null>(null);

  // ===== ASSEMBLY STATE (right panel of Inventory tab) =====
  const [assemblyOrders, setAssemblyOrders] = useState<AssemblyOrderData[]>([]);
  const [isLoadingAssembly, setIsLoadingAssembly] = useState(true);

  // ===== STOCK STATE =====
  const [stockOrders, setStockOrders] = useState<StockOrderData[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);

  // Derive unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (activeCategory !== 'All') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.serialNumber.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [products, activeCategory, search]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Load orders when Orders tab is active
  useEffect(() => {
    if (activeNav === 'Orders') {
      loadOrders();
    }
  }, [activeNav]);

  // Load production data when Production tab is active
  useEffect(() => {
    if (activeNav === 'Production') {
      loadProductionOrders();
    }
  }, [activeNav]);

  // Load inventory + assembly when Inventory tab is active
  useEffect(() => {
    if (activeNav === 'Inventory') {
      loadInventory();
      loadAssemblyOrders();
    }
  }, [activeNav]);

  // Load stock when Stock tab is active
  useEffect(() => {
    if (activeNav === 'Stock') {
      loadStockOrders();
    }
  }, [activeNav]);

  async function loadProducts() {
    if (!window.electron) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const result = await window.electron.getProducts();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleProductCreated(product: { id: string; serialNumber: string; category: string }) {
    setShowCreateProduct(false);
    // Open elements modal for the newly created product
    setElementsModal({ productId: product.id, productName: product.serialNumber });
  }

  function handleElementsDone() {
    setElementsModal(null);
    // Reload products to get fresh data with elements
    loadProducts();
  }

  async function handleDeleteProduct(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteProduct(id);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        console.error('Failed to delete product:', result.error);
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  }

  // ===== ORDER FUNCTIONS =====

  async function loadOrders() {
    if (!window.electron) {
      setIsLoadingOrders(false);
      return;
    }
    setIsLoadingOrders(true);
    try {
      const result = await window.electron.getOrders();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }

  // Filtered orders
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

  function handleOrderCreated(order: { id: string; orderNumber: number; clientName: string }) {
    setShowCreateOrder(false);
    // Open items modal to add products to the order
    setOrderItemsModal({ orderId: order.id, orderNumber: order.orderNumber });
  }

  function handleOrderItemsDone() {
    setOrderItemsModal(null);
    loadOrders();
  }

  async function handleStartProduction(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.updateOrder(id, { status: 'in_production' });
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'in_production' } : o));
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
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped' } : o));
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

  // ===== PRODUCTION FUNCTIONS =====

  async function loadProductionOrders() {
    if (!window.electron) {
      setIsLoadingProduction(false);
      return;
    }
    setIsLoadingProduction(true);
    try {
      const result = await window.electron.getProductionOrders();
      if (result.success) {
        setProductionOrders(result.data);
      }
    } catch (err) {
      console.error('Failed to load production orders:', err);
    } finally {
      setIsLoadingProduction(false);
    }
  }

  async function handleRecordProduction(orderId: string, elementId: string, colorId: string, amount: number): Promise<number | null> {
    if (!window.electron) return null;
    try {
      const result = await window.electron.recordProduction({ orderId, elementId, colorId, amountProduced: amount });
      if (result.success) {
        return result.data.remaining;
      }
      return null;
    } catch (err) {
      console.error('Failed to record production:', err);
      return null;
    }
  }

  // ===== INVENTORY FUNCTIONS =====

  async function loadInventory() {
    if (!window.electron) {
      setIsLoadingInventory(false);
      return;
    }
    setIsLoadingInventory(true);
    try {
      const result = await window.electron.getInventory();
      if (result.success) {
        // Only show elements with stock > 0
        setInventory(result.data.filter((item: InventoryResponse) => item.totalAmount > 0));
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoadingInventory(false);
    }
  }

  // ===== ASSEMBLY FUNCTIONS =====

  async function loadAssemblyOrders() {
    if (!window.electron) {
      setIsLoadingAssembly(false);
      return;
    }
    setIsLoadingAssembly(true);
    try {
      const result = await window.electron.getAssemblyOrders();
      if (result.success) {
        setAssemblyOrders(result.data);
      }
    } catch (err) {
      console.error('Failed to load assembly orders:', err);
    } finally {
      setIsLoadingAssembly(false);
    }
  }

  async function handleRecordAssembly(orderId: string, productId: string, boxes: number): Promise<boolean> {
    if (!window.electron) return false;
    try {
      const result = await window.electron.recordAssembly({ orderId, productId, boxesAssembled: boxes });
      if (result.success) {
        // Patch local state
        setAssemblyOrders(prev => {
          const updated = prev.map(order => {
            if (order.orderId !== orderId) return order;
            return {
              ...order,
              products: order.products.map(p => {
                if (p.productId !== productId) return p;
                return {
                  ...p,
                  boxesAssembled: result.data.boxesAssembled,
                  remaining: result.data.remaining,
                };
              }),
            };
          });
          // Remove orders where ALL products are fully assembled
          return updated.filter(order => order.products.some(p => p.remaining > 0));
        });
        // Also refresh inventory panel so stock numbers update
        loadInventory();
        return true;
      }
      // Show error to the user (e.g. insufficient inventory)
      if (result.error) {
        alert(result.error);
      }
      return false;
    } catch (err) {
      console.error('Failed to record assembly:', err);
      return false;
    }
  }

  // ===== STOCK FUNCTIONS =====

  async function loadStockOrders() {
    if (!window.electron) {
      setIsLoadingStock(false);
      return;
    }
    setIsLoadingStock(true);
    try {
      const result = await window.electron.getStockOrders();
      if (result.success) {
        setStockOrders(result.data);
      }
    } catch (err) {
      console.error('Failed to load stock orders:', err);
    } finally {
      setIsLoadingStock(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ===== Top Bar ===== */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Production Management</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Version + Update Status */}
          {appVersion && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">v{appVersion}</span>
          )}
          {updateStatus?.status === 'available' && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              v{updateStatus.version} downloading...
            </span>
          )}
          {updateStatus?.status === 'downloading' && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              Downloading {updateStatus.percent}%
            </span>
          )}
          {updateStatus?.status === 'downloaded' && (
            <button
              onClick={() => window.electron?.quitAndInstall()}
              className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 hover:bg-green-200 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-950/60 transition-colors"
            >
              Update to v{updateStatus.version} — Restart
            </button>
          )}
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as <span className="font-medium text-zinc-700 dark:text-zinc-200">{user.username}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-red-400 dark:focus:ring-offset-zinc-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ===== Main Navigation Tabs ===== */}
      <nav className="border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-1">
          {NAV_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveNav(tab)}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                activeNav === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              {tab}
              {activeNav === tab && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== Content Area ===== */}
      <main className="flex-1 overflow-y-auto">
        {activeNav === 'Products' ? (
          <div className="mx-auto max-w-7xl p-6">
            {/* Toolbar: Category tabs + Search + Add button */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search + Add */}
              <div className="flex gap-2">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by code..."
                    className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <button
                  onClick={() => setShowCreateProduct(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              </div>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading products...</div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {products.length === 0 ? 'No products yet' : 'No products match your filter'}
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {products.length === 0 ? 'Click "Add Product" to create your first product.' : 'Try a different category or search term.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onDelete={handleDeleteProduct} />
                ))}
              </div>
            )}
          </div>
        ) : activeNav === 'Orders' ? (
          /* ===== Orders Tab ===== */
          <div className="mx-auto max-w-7xl p-6">
            {/* Toolbar: Status filter + Search + Add button */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {['All', 'pending', 'in_production', 'shipped'].map(status => {
                  const labels: Record<string, string> = { All: 'All', pending: 'Pending', in_production: 'In Production', shipped: 'Shipped' };
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

              {/* Search + Add */}
              <div className="flex gap-2">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by client or #..."
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
                  New Order
                </button>
              </div>
            </div>

            {/* Orders Grid */}
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading orders...</div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {orders.length === 0 ? 'No orders yet' : 'No orders match your filter'}
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {orders.length === 0 ? 'Click "New Order" to create your first order.' : 'Try a different status or search term.'}
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
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeNav === 'Production' ? (
          /* ===== Production Tab ===== */
          <div className="mx-auto max-w-5xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Production Orders</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Track element manufacturing progress for orders in production
                </p>
              </div>
              <button
                onClick={loadProductionOrders}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Refresh
              </button>
            </div>

            {isLoadingProduction ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading production data...</div>
              </div>
            ) : productionOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No orders in production</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Set an order&apos;s status to &quot;In Production&quot; from the Orders tab to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {productionOrders.map(order => (
                  <ProductionOrderCard
                    key={order.orderId}
                    order={order}
                    onRecordProduction={handleRecordProduction}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeNav === 'Inventory' ? (
          /* ===== Inventory Tab — 2 panels ===== */
          <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
            {/* LEFT: Element Inventory */}
            <div className="flex-1 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Element Inventory</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Current stock of manufactured elements</p>
                </div>
                <button
                  onClick={loadInventory}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Refresh
                </button>
              </div>

              {isLoadingInventory ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
                </div>
              ) : inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No elements in inventory</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Record production in the Production tab to add elements.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      {/* Image */}
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
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.element?.uniqueName ?? 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div
                            className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                            style={{ backgroundColor: colorNameToHex(item.color?.colorName || '') }}
                            title={item.color?.colorName}
                          />
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.color?.colorName ?? 'Unknown'}</span>
                          <span className="text-xs text-zinc-400">·</span>
                          <span className="text-xs text-zinc-400">{item.element?.material ?? ''}</span>
                        </div>
                      </div>
                      {/* Stock amount — LARGE */}
                      <div className="text-right">
                        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{item.totalAmount}</p>
                        <p className="text-xs text-zinc-400">in stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Assembly — Orders in production with product box counts */}
            <div className="w-[420px] flex-shrink-0 overflow-y-auto bg-zinc-100/50 dark:bg-zinc-900/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Assembly</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Record boxes assembled today</p>
                </div>
                <button
                  onClick={loadAssemblyOrders}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Refresh
                </button>
              </div>

              {isLoadingAssembly ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
                </div>
              ) : assemblyOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No orders in production</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assemblyOrders.map(order => (
                    <AssemblyOrderCard
                      key={order.orderId}
                      order={order}
                      onRecordAssembly={handleRecordAssembly}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeNav === 'Stock' ? (
          /* ===== Stock Tab ===== */
          <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Stock Overview</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Completed boxes per order
                </p>
              </div>
              <button
                onClick={loadStockOrders}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Refresh
              </button>
            </div>

            {isLoadingStock ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading stock...</div>
              </div>
            ) : stockOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No stock data yet</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Assemble boxes in the Inventory tab to see stock here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {stockOrders.map(order => (
                  <StockOrderCard key={order.orderId} order={order} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* ===== Modals ===== */}
      <CreateProductModal
        isOpen={showCreateProduct}
        onClose={() => setShowCreateProduct(false)}
        onCreated={handleProductCreated}
        existingCategories={[...new Set(products.map(p => p.category))].sort()}
      />

      <ProductElementsModal
        isOpen={!!elementsModal}
        productId={elementsModal?.productId || null}
        productName={elementsModal?.productName || ''}
        onClose={() => { setElementsModal(null); loadProducts(); }}
        onDone={handleElementsDone}
      />

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
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Assembly Order Card (right panel of Inventory tab)
// ──────────────────────────────────────────────────────────────

function AssemblyOrderCard({
  order,
  onRecordAssembly,
}: {
  order: AssemblyOrderData;
  onRecordAssembly: (orderId: string, productId: string, boxes: number) => Promise<boolean>;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Order #{order.orderNumber}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{order.clientName}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          In Production
        </span>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {order.products.map(product => (
          <AssemblyProductRow
            key={product.orderItemId}
            product={product}
            orderId={order.orderId}
            onRecordAssembly={onRecordAssembly}
          />
        ))}
      </div>
    </div>
  );
}

function AssemblyProductRow({
  product,
  orderId,
  onRecordAssembly,
}: {
  product: AssemblyOrderData['products'][0];
  orderId: string;
  onRecordAssembly: (orderId: string, productId: string, boxes: number) => Promise<boolean>;
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
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid number');
      return;
    }
    if (amount > localRemaining) {
      setError(`Max: ${localRemaining}`);
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const ok = await onRecordAssembly(orderId, product.productId, amount);
      if (ok) {
        setLocalAssembled(prev => prev + amount);
        setInputValue('');
      } else {
        setError('Failed');
      }
    } catch {
      setError('Failed');
    } finally {
      setIsSubmitting(false);
    }
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
            <div
              className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {!isDone && (
        <div className="mt-2 flex items-center gap-2 pl-[68px]">
          <input
            type="number"
            min="1"
            max={localRemaining}
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={`Add (max ${localRemaining})`}
            className="w-32 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !inputValue}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '...' : 'Add'}
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
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
}

// ──────────────────────────────────────────────────────────────
// Stock Order Card (Stock tab)
// ──────────────────────────────────────────────────────────────

function StockOrderCard({ order }: { order: StockOrderData }) {
  const totalBoxesNeeded = order.products.reduce((s, p) => s + p.boxesNeeded, 0);
  const totalBoxesReady = order.products.reduce((s, p) => s + p.boxesReady, 0);
  const allComplete = totalBoxesReady >= totalBoxesNeeded;

  return (
    <div className={`rounded-xl border shadow-sm ${
      allComplete
        ? 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10'
        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
    }`}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Order #{order.orderNumber}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{order.clientName}</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold tabular-nums ${allComplete ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {totalBoxesReady}
            </span>
            <span className="text-lg text-zinc-400">/</span>
            <span className="text-3xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">{totalBoxesNeeded}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">total boxes</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {order.products.map(product => {
          const done = product.boxesReady >= product.boxesNeeded;
          const progress = product.boxesNeeded > 0 ? Math.min(100, (product.boxesReady / product.boxesNeeded) * 100) : 0;
          return (
            <div key={product.productId} className="flex items-center gap-4 px-5 py-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.serialNumber} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{product.serialNumber}</p>
                <div className="mt-1.5 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className={`text-2xl font-bold tabular-nums ${done ? 'text-green-600 dark:text-green-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {product.boxesReady}
                </span>
                <span className="text-base text-zinc-400">/</span>
                <span className="text-2xl font-bold tabular-nums text-zinc-400 dark:text-zinc-500">{product.boxesNeeded}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
