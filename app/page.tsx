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
  ElementResponse,
  RawMaterialResponse,
} from '../types/ipc';
import { colorNameToHex } from '../lib/utils';

// Main navigation tabs
const NAV_TABS = ['Products', 'Elements', 'Orders', 'Inventory', 'Production', 'Storage', 'Stock'] as const;
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
  const [editProductModal, setEditProductModal] = useState<ProductResponse | null>(null);
  const [cloneProductModal, setCloneProductModal] = useState<ProductResponse | null>(null);

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

  // ===== ELEMENTS STATE =====
  const [elements, setElements] = useState<ElementResponse[]>([]);
  const [isLoadingElements, setIsLoadingElements] = useState(true);
  const [showCreateElement, setShowCreateElement] = useState(false);
  const [elementSearch, setElementSearch] = useState('');
  const [activeElementCategory, setActiveElementCategory] = useState<string>('All');

  // ===== RAW MATERIALS (STORAGE) STATE =====
  const [rawMaterials, setRawMaterials] = useState<RawMaterialResponse[]>([]);
  const [isLoadingRawMaterials, setIsLoadingRawMaterials] = useState(true);
  const [showCreateRawMaterial, setShowCreateRawMaterial] = useState(false);
  const [rawMaterialSearch, setRawMaterialSearch] = useState('');
  const [adjustStockModal, setAdjustStockModal] = useState<RawMaterialResponse | null>(null);
  const [editRawMaterialModal, setEditRawMaterialModal] = useState<RawMaterialResponse | null>(null);

  // Derive unique element names as categories
  const elementCategories = useMemo(() => {
    const names = new Set(elements.map(e => e.uniqueName));
    return ['All', ...Array.from(names).sort()];
  }, [elements]);

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

  // Load elements when Elements tab is active
  useEffect(() => {
    if (activeNav === 'Elements') {
      loadElements();
    }
  }, [activeNav]);

  // Load raw materials when Storage tab is active
  useEffect(() => {
    if (activeNav === 'Storage') {
      loadRawMaterials();
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

  async function handleEditProduct(product: ProductResponse) {
    setEditProductModal(product);
  }

  async function handleCloneProduct(product: ProductResponse) {
    setCloneProductModal(product);
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
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'shipped', shippedAt: new Date() } : o));
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

  async function handleRecordProduction(orderId: string, elementId: string, amount: number): Promise<number | null> {
    if (!window.electron) return null;
    try {
      const result = await window.electron.recordProduction({ orderId, elementId, amountProduced: amount });
      if (result.success) {
        // Auto-remove completed orders from production view
        if (result.data.orderComplete) {
          setProductionOrders(prev => prev.filter(o => o.orderId !== orderId));
        }
        return result.data.remaining;
      }
      return null;
    } catch (err) {
      console.error('Failed to record production:', err);
      return null;
    }
  }

  function handlePrintProduction(mode: 'orders' | 'totals', orderId?: string) {
    // Helper: build a responsive pivot table (Color rows × Element columns)
    // Now includes Label as a column when any element has a label
    function buildPivotTable(
      elements: { elementName: string; elementLabel?: string; color: string; remaining?: number; totalNeeded?: number }[],
      _showTotals: boolean
    ): string {
      const elementNames = [...new Set(elements.map(e => e.elementName))].sort();
      const colors = [...new Set(elements.map(e => e.color))].sort();
      const hasLabels = elements.some(e => e.elementLabel);
      if (elementNames.length === 0 || colors.length === 0) return '';

      // Build lookup: key = elementName|color|label
      const lookup = new Map<string, { remaining: number; totalNeeded: number; label: string }>();
      for (const el of elements) {
        const lbl = el.elementLabel || '';
        const key = `${el.elementName}|${el.color}|${lbl}`;
        const existing = lookup.get(key);
        if (existing) {
          existing.remaining += el.remaining ?? 0;
          existing.totalNeeded += el.totalNeeded ?? 0;
        } else {
          lookup.set(key, { remaining: el.remaining ?? 0, totalNeeded: el.totalNeeded ?? 0, label: lbl });
        }
      }

      // Build unique row keys: color + label combinations
      const rowKeys: { color: string; label: string }[] = [];
      const rowKeySet = new Set<string>();
      for (const el of elements) {
        const lbl = el.elementLabel || '';
        const rk = `${el.color}|${lbl}`;
        if (!rowKeySet.has(rk)) {
          rowKeySet.add(rk);
          rowKeys.push({ color: el.color, label: lbl });
        }
      }
      rowKeys.sort((a, b) => a.color.localeCompare(b.color) || a.label.localeCompare(b.label));

      // Dynamic sizing: scale font + padding based on column count
      const extraCols = hasLabels ? 2 : 1; // Color + optional Label
      const colCount = elementNames.length + extraCols;
      const maxNameLen = Math.max(...elementNames.map(n => n.length), ...colors.map(c => c.length));
      let fontSize: number;
      let cellPad: string;
      if (colCount <= 5) { fontSize = 13; cellPad = '6px 10px'; }
      else if (colCount <= 8) { fontSize = 11; cellPad = '4px 7px'; }
      else if (colCount <= 12) { fontSize = 9; cellPad = '3px 5px'; }
      else { fontSize = 7; cellPad = '2px 3px'; }

      if (maxNameLen > 18 && fontSize > 9) fontSize = Math.max(fontSize - 2, 7);

      const colorColPct = Math.min(20, Math.max(10, Math.round(100 / colCount * 1.2)));
      const labelColPct = hasLabels ? Math.min(18, Math.max(8, Math.round(100 / colCount * 1.1))) : 0;
      const datColPct = ((100 - colorColPct - labelColPct) / elementNames.length).toFixed(2);

      let html = `<table style="width:100%;border-collapse:collapse;font-size:${fontSize}px;margin-bottom:1rem;table-layout:fixed;">`;
      html += `<colgroup><col style="width:${colorColPct}%;">`;
      if (hasLabels) html += `<col style="width:${labelColPct}%;">`;
      for (let i = 0; i < elementNames.length; i++) {
        html += `<col style="width:${datColPct}%;">`;
      }
      html += `</colgroup>`;

      // Header
      html += `<thead><tr>`;
      html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:left;word-break:break-word;overflow-wrap:break-word;">Color</th>`;
      if (hasLabels) {
        html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:left;word-break:break-word;overflow-wrap:break-word;">Label</th>`;
      }
      for (const name of elementNames) {
        html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:center;word-break:break-word;overflow-wrap:break-word;">${name}</th>`;
      }
      html += `</tr></thead><tbody>`;

      // Pre-compute color rowspans
      const colorSpans = new Map<string, number>();
      for (const row of rowKeys) {
        colorSpans.set(row.color, (colorSpans.get(row.color) || 0) + 1);
      }
      const colorRendered = new Set<string>();

      // Data rows
      for (const row of rowKeys) {
        html += `<tr>`;
        if (!colorRendered.has(row.color)) {
          colorRendered.add(row.color);
          const span = colorSpans.get(row.color) || 1;
          html += `<td rowspan="${span}" style="border:1px solid #444;padding:${cellPad};font-weight:bold;text-align:left;vertical-align:top;word-break:break-word;overflow-wrap:break-word;">${row.color}</td>`;
        }
        if (hasLabels) {
          html += `<td style="border:1px solid #444;padding:${cellPad};text-align:left;font-weight:bold;text-transform:uppercase;color:#7c3aed;word-break:break-word;overflow-wrap:break-word;">${row.label || '-'}</td>`;
        }
        for (const name of elementNames) {
          const val = lookup.get(`${name}|${row.color}|${row.label}`);
          if (val) {
            html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;background:#f9f9f9;">${Math.max(0, val.remaining)}</td>`;
          } else {
            html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;color:#ccc;">-</td>`;
          }
        }
        html += `</tr>`;
      }

      // Column totals row
      html += `<tr>`;
      html += `<td style="border:1px solid #444;padding:${cellPad};font-weight:bold;text-align:left;background:#e5e5e5;">Total</td>`;
      if (hasLabels) {
        html += `<td style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;"></td>`;
      }
      for (const name of elementNames) {
        let colTotal = 0;
        for (const row of rowKeys) {
          const val = lookup.get(`${name}|${row.color}|${row.label}`);
          if (val) colTotal += Math.max(0, val.remaining);
        }
        html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;font-weight:bold;background:#e5e5e5;">${colTotal}</td>`;
      }
      html += `</tr>`;

      html += `</tbody></table>`;
      return html;
    }

    let printHtml = '';
    const dateStr = new Date().toLocaleDateString('en-GB');

    if (mode === 'orders') {
      const ordersToPrint = orderId
        ? productionOrders.filter(o => o.orderId === orderId)
        : productionOrders;
      for (const order of ordersToPrint) {
        const allEls = order.elements.map(e => ({ elementName: e.elementName, elementLabel: e.elementLabel, color: e.color, remaining: e.remaining, totalNeeded: e.totalNeeded }));
        const labeledEls = allEls.filter(e => e.elementLabel);
        const unlabeledEls = allEls.filter(e => !e.elementLabel);
        printHtml += `<div class="order-block">`;
        printHtml += `<h2>Order #${order.orderNumber} — ${order.clientName}</h2>`;
        printHtml += `<p>Date: ${dateStr}${order.notes ? ` · Notes: ${order.notes}` : ''}</p>`;
        if (unlabeledEls.length > 0) {
          printHtml += buildPivotTable(unlabeledEls, false);
        }
        if (labeledEls.length > 0) {
          printHtml += `<h3 style="margin:0.5rem 0 0.2rem;font-size:13px;color:#7c3aed;">Labeled Elements</h3>`;
          printHtml += buildPivotTable(labeledEls, false);
        }
        printHtml += `</div>`;
      }
    } else {
      // Totals: aggregate across all orders, include label in grouping
      const aggregated = new Map<string, { elementName: string; elementLabel: string; color: string; totalNeeded: number; remaining: number }>();
      for (const order of productionOrders) {
        for (const el of order.elements) {
          const key = `${el.elementName}|${el.color}|${el.elementLabel ?? ''}`;
          const existing = aggregated.get(key);
          if (existing) {
            existing.totalNeeded += el.totalNeeded;
            existing.remaining += el.remaining;
          } else {
            aggregated.set(key, { elementName: el.elementName, elementLabel: el.elementLabel ?? '', color: el.color, totalNeeded: el.totalNeeded, remaining: el.remaining });
          }
        }
      }
      const allItems = Array.from(aggregated.values());

      printHtml += `<div class="order-block">`;
      printHtml += `<h2>Total Requirements — All Orders</h2>`;
      printHtml += `<p>Date: ${dateStr} · ${productionOrders.length} order(s) in production</p>`;
      const allEls = allItems.map(i => ({ elementName: i.elementName, elementLabel: i.elementLabel, color: i.color, remaining: i.remaining, totalNeeded: i.totalNeeded }));
      const labeledEls = allEls.filter(e => e.elementLabel);
      const unlabeledEls = allEls.filter(e => !e.elementLabel);
      if (unlabeledEls.length > 0) {
        printHtml += buildPivotTable(unlabeledEls, false);
      }
      if (labeledEls.length > 0) {
        printHtml += `<h3 style="margin:0.5rem 0 0.2rem;font-size:13px;color:#7c3aed;">Labeled Elements</h3>`;
        printHtml += buildPivotTable(labeledEls, false);
      }
      printHtml += `</div>`;
    }

    // Open print window with dynamic responsive styles
    const printWindow = window.open('', '_blank', 'width=1100,height=700');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Production Print</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; padding: 1rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Sticky preview header */
          .header { position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid #333; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .print-btn { background: #2563eb; color: white; border: none; padding: 0.6rem 1.4rem; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
          .print-btn:hover { background: #1d4ed8; }
          .print-btn:active { transform: scale(0.95); }

          /* Content area */
          .content { background: white; padding: 1.5rem; border-radius: 4px; }

          /* Order blocks — each order avoids page-break splits */
          .order-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 1.5rem; }

          /* Label sections */
          .label-section { margin-top: 0.5rem; }
          .label-header { margin: 0.5rem 0 0.25rem; font-size: 12px; color: #7c3aed; font-style: italic; }

          /* Headings */
          h2 { margin: 0 0 0.2rem; font-size: 15px; }
          p { margin: 0 0 0.4rem; font-size: 10px; color: #666; }

          /* Print overrides */
          @media print {
            .header { display: none !important; }
            body { background: white; padding: 0; }
            .content { padding: 0; box-shadow: none; border-radius: 0; }
            /* Let large tables shrink to fit the page width */
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head><body>
        <div class="header">
          <div>
            <h3 style="margin:0;">Production Print Preview</h3>
            <p style="margin:0.2rem 0 0;color:#999;font-size:11px;">Landscape A4 · Click the button to print</p>
          </div>
          <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        <div class="content">
          ${printHtml}
        </div>
      </body></html>`);
      printWindow.document.close();
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

  async function handleDeleteInventory(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteInventory(id);
      if (result.success) {
        setInventory(prev => prev.filter(item => item.id !== id));
      } else {
        alert(result.error || 'Failed to delete inventory item');
      }
    } catch (err) {
      console.error('Failed to delete inventory:', err);
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

  // ===== ELEMENTS FUNCTIONS =====

  async function loadElements() {
    if (!window.electron) {
      setIsLoadingElements(false);
      return;
    }
    setIsLoadingElements(true);
    try {
      const result = await window.electron.getElements();
      if (result.success) {
        setElements(result.data);
      }
    } catch (err) {
      console.error('Failed to load elements:', err);
    } finally {
      setIsLoadingElements(false);
    }
  }

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

  // ===== RAW MATERIALS FUNCTIONS =====
  async function loadRawMaterials() {
    if (!window.electron) {
      setIsLoadingRawMaterials(false);
      return;
    }
    setIsLoadingRawMaterials(true);
    try {
      const result = await window.electron.getRawMaterials();
      if (result.success) {
        setRawMaterials(result.data);
      }
    } catch (err) {
      console.error('Failed to load raw materials:', err);
    } finally {
      setIsLoadingRawMaterials(false);
    }
  }

  const filteredRawMaterials = useMemo(() => {
    if (!rawMaterialSearch.trim()) return rawMaterials;
    const q = rawMaterialSearch.trim().toLowerCase();
    return rawMaterials.filter(m =>
      m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q)
    );
  }, [rawMaterials, rawMaterialSearch]);

  async function handleDeleteRawMaterial(id: string) {
    if (!window.electron) return;
    try {
      const result = await window.electron.deleteRawMaterial(id);
      if (result.success) {
        setRawMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        alert(result.error || 'Failed to delete raw material');
      }
    } catch {
      alert('Failed to delete raw material');
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    onDelete={handleDeleteProduct}
                    onEdit={handleEditProduct}
                    onClone={handleCloneProduct}
                  />
                ))}
              </div>
            )}
          </div>
        ) : activeNav === 'Elements' ? (
          /* ===== Elements Tab ===== */
          <div className="mx-auto max-w-7xl p-6">
            {/* Toolbar: Category filter + Search + Add */}
            <div className="mb-6 flex flex-col gap-4">
              {/* Category Filter Tabs */}
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

              {/* Search + Add */}
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
          /* ===== Production Tab — 2 panels ===== */
          <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
            {/* LEFT: Production Order Cards */}
            <div className="flex-1 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Production Orders</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Track element manufacturing progress for orders in production
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {productionOrders.length > 0 && (
                    <button
                      onClick={() => handlePrintProduction('orders')}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Print
                    </button>
                  )}
                  <button
                    onClick={loadProductionOrders}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Refresh
                  </button>
                </div>
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
                      onPrint={(id) => handlePrintProduction('orders', id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Aggregated Totals Panel */}
            <div className="w-[380px] flex-shrink-0 overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Total Requirements</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Aggregated across all orders</p>
                </div>
                {productionOrders.length > 0 && (
                  <button
                    onClick={() => handlePrintProduction('totals')}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Print
                  </button>
                )}
              </div>

              {isLoadingProduction ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
                </div>
              ) : productionOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No production data</p>
                </div>
              ) : (() => {
                // Aggregate elements across all orders by name + color + label
                const aggregated = new Map<string, { elementName: string; elementLabel: string; color: string; color2: string | null; isDualColor: boolean; totalNeeded: number; totalProduced: number; remaining: number; totalWeightGrams: number }>();
                for (const order of productionOrders) {
                  for (const el of order.elements) {
                    const key = `${el.elementName}|${el.color}|${el.color2 ?? ''}|${el.elementLabel ?? ''}`;
                    const existing = aggregated.get(key);
                    if (existing) {
                      existing.totalNeeded += el.totalNeeded;
                      existing.totalProduced += el.totalProduced;
                      existing.remaining += el.remaining;
                      existing.totalWeightGrams += el.totalWeightGrams;
                    } else {
                      aggregated.set(key, {
                        elementName: el.elementName,
                        elementLabel: el.elementLabel ?? '',
                        color: el.color,
                        color2: el.color2,
                        isDualColor: el.isDualColor,
                        totalNeeded: el.totalNeeded,
                        totalProduced: el.totalProduced,
                        remaining: el.remaining,
                        totalWeightGrams: el.totalWeightGrams,
                      });
                    }
                  }
                }
                const allItems = Array.from(aggregated.values()).sort((a, b) => a.elementName.localeCompare(b.elementName) || a.color.localeCompare(b.color));
                const renderItem = (item: typeof allItems[0], idx: number) => {
                  const isDone = item.remaining <= 0;
                  const progressPercent = item.totalNeeded > 0 ? Math.min(100, (item.totalProduced / item.totalNeeded) * 100) : 0;
                  return (
                    <div key={idx} className={`rounded-lg border px-3 py-2.5 ${isDone ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.elementName}</span>
                        <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-500 flex-shrink-0" style={{ backgroundColor: colorNameToHex(item.color) }} title={item.color} />
                        {item.isDualColor && item.color2 && (
                          <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-500 flex-shrink-0 -ml-1.5" style={{ backgroundColor: colorNameToHex(item.color2) }} title={item.color2} />
                        )}
                        {item.elementLabel && (
                          <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-bold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{item.elementLabel}</span>
                        )}
                        {isDone && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
                        <span>Need: <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.totalNeeded}</span></span>
                        <span>Rem: <span className={`font-bold ${isDone ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{Math.max(0, item.remaining)}</span></span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  );
                };
                return (
                  <div className="space-y-2">
                    {allItems.map((item, idx) => renderItem(item, idx))}
                    <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{allItems.length} element type{allItems.length !== 1 ? 's' : ''}</span>
                        <span>{allItems.filter(i => i.remaining <= 0).length} done</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
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
                            style={{ backgroundColor: colorNameToHex(item.element?.color || '') }}
                            title={item.element?.color}
                          />
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.element?.color ?? 'Unknown'}</span>
                          {item.element?.color2 && (
                            <>
                              <div
                                className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                                style={{ backgroundColor: colorNameToHex(item.element.color2) }}
                                title={item.element.color2}
                              />
                              <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.element.color2}</span>
                            </>
                          )}
                          <span className="text-xs text-zinc-400">·</span>
                          <span className="text-xs text-zinc-400">{item.element?.material ?? ''}</span>
                        </div>
                      </div>
                      {/* Stock amount — LARGE */}
                      <div className="text-right">
                        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{item.totalAmount}</p>
                        <p className="text-xs text-zinc-400">in stock</p>
                      </div>
                      {/* Delete button (testing) */}
                      <button
                        onClick={() => {
                          if (confirm(`Delete inventory for ${item.element?.uniqueName ?? 'this element'}? This cannot be undone.`)) {
                            handleDeleteInventory(item.id);
                          }
                        }}
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
        ) : activeNav === 'Storage' ? (
          /* ===== Storage Tab (Raw Materials) ===== */
          <div className="mx-auto max-w-7xl p-6">
            {/* Toolbar */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Raw Materials Storage</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Manage raw material stock levels. Materials are consumed during production and assembly.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={rawMaterialSearch}
                    onChange={(e) => setRawMaterialSearch(e.target.value)}
                    placeholder="Search materials..."
                    className="w-56 rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <button
                  onClick={() => setShowCreateRawMaterial(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Material
                </button>
              </div>
            </div>

            {/* Raw Materials Grid */}
            {isLoadingRawMaterials ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading raw materials...</div>
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

      {/* Create Element Modal */}
      {showCreateElement && (
        <CreateElementInlineModal
          onClose={() => setShowCreateElement(false)}
          onCreated={handleElementCreated}
        />
      )}

      {/* Edit Product Modal */}
      {editProductModal && (
        <EditProductModal
          product={editProductModal}
          onClose={() => setEditProductModal(null)}
          onSaved={() => { setEditProductModal(null); loadProducts(); }}
          onEditElements={() => {
            const p = editProductModal;
            setEditProductModal(null);
            setElementsModal({ productId: p.id, productName: p.serialNumber });
          }}
        />
      )}

      {/* Clone Product Modal */}
      {cloneProductModal && (
        <CloneProductModal
          product={cloneProductModal}
          onClose={() => setCloneProductModal(null)}
          onCloned={() => { setCloneProductModal(null); loadProducts(); }}
        />
      )}

      {/* Create Raw Material Modal */}
      {showCreateRawMaterial && (
        <CreateRawMaterialModal
          onClose={() => setShowCreateRawMaterial(false)}
          onCreated={() => { setShowCreateRawMaterial(false); loadRawMaterials(); }}
        />
      )}

      {/* Adjust Stock Modal */}
      {adjustStockModal && (
        <AdjustStockModal
          material={adjustStockModal}
          onClose={() => setAdjustStockModal(null)}
          onAdjusted={() => { setAdjustStockModal(null); loadRawMaterials(); }}
        />
      )}

      {/* Edit Raw Material Modal */}
      {editRawMaterialModal && (
        <EditRawMaterialModal
          material={editRawMaterialModal}
          onClose={() => setEditRawMaterialModal(null)}
          onSaved={() => { setEditRawMaterialModal(null); loadRawMaterials(); }}
        />
      )}
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setInputValue(v); setError(''); }}
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

// ──────────────────────────────────────────────────────────────
// Element Card (Elements tab)
// ──────────────────────────────────────────────────────────────

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
    } catch {
      // ignore
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-blue-400 bg-white p-4 shadow-lg dark:border-blue-600 dark:bg-zinc-900">
        <div className="space-y-3">
          <input
            type="text"
            value={editForm.uniqueName}
            onChange={(e) => setEditForm(prev => ({ ...prev, uniqueName: e.target.value }))}
            placeholder="Element name"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            value={editForm.label}
            onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Label (optional — groups in production)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={editForm.color}
              onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
              placeholder="Color"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <div
              className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
              style={{ backgroundColor: colorNameToHex(editForm.color) }}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editForm.isDualColor}
              onChange={(e) => setEditForm(prev => ({ ...prev, isDualColor: e.target.checked }))}
              className="rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Dual color</span>
          </label>
          {editForm.isDualColor && (
            <div className="flex gap-2">
              <input
                type="text"
                value={editForm.color2}
                onChange={(e) => setEditForm(prev => ({ ...prev, color2: e.target.value }))}
                placeholder="Second color"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <div
                className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                style={{ backgroundColor: colorNameToHex(editForm.color2) }}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Raw Material</label>
            {availableMaterials.length > 0 ? (
              <select
                value={editForm.rawMaterialId}
                onChange={(e) => setEditForm(prev => ({ ...prev, rawMaterialId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
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
          <input
            type="number"
            value={editForm.weightGrams}
            onChange={(e) => setEditForm(prev => ({ ...prev, weightGrams: Number(e.target.value) }))}
            placeholder="Weight (g)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={handleSelectImage}
            className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {editForm.imageUrl ? 'Change Image' : 'Select Image'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !editForm.uniqueName || !editForm.color}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image */}
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

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{element.uniqueName}</h3>
        {element.label && (
          <span className="mt-0.5 inline-block rounded bg-purple-100 px-2 py-0.5 text-sm font-bold uppercase text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
            🏷 {element.label}
          </span>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <div
            className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
            style={{ backgroundColor: colorNameToHex(element.color) }}
            title={element.color}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{element.color}</span>
          {element.isDualColor && element.color2 && (
            <>
              <span className="text-xs text-zinc-400">+</span>
              <div
                className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                style={{ backgroundColor: colorNameToHex(element.color2) }}
                title={element.color2}
              />
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
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-blue-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-blue-400"
          title="Edit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onClone(element)}
          className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-green-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-green-400"
          title="Clone"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${element.uniqueName}"?`)) {
              onDelete(element.id);
            }
          }}
          className="rounded-lg bg-white/90 p-1.5 text-zinc-500 shadow-sm hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:text-red-400"
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Create Element Inline Modal
// ──────────────────────────────────────────────────────────────

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

  // Derive material name from selected raw material
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
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Create Element</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.uniqueName}
            onChange={(e) => setForm(prev => ({ ...prev, uniqueName: e.target.value }))}
            placeholder="Element name (e.g., Bucket, Lid)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Label (optional — groups in production)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
              placeholder="Color (e.g., Red)"
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
            />
            <div
              className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
              style={{ backgroundColor: colorNameToHex(form.color) }}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isDualColor}
              onChange={(e) => setForm(prev => ({ ...prev, isDualColor: e.target.checked }))}
              className="rounded border-zinc-300"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Dual color (halves production quantity)</span>
          </label>
          {form.isDualColor && (
            <div className="flex gap-2">
              <input
                type="text"
                value={form.color2}
                onChange={(e) => setForm(prev => ({ ...prev, color2: e.target.value }))}
                placeholder="Second color"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <div
                className="h-9 w-9 rounded-lg border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                style={{ backgroundColor: colorNameToHex(form.color2) }}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Raw Material <span className="text-red-500">*</span></label>
            {availableMaterials.length > 0 ? (
              <select
                value={form.rawMaterialId}
                onChange={(e) => setForm(prev => ({ ...prev, rawMaterialId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              >
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
          <input
            type="number"
            value={form.weightGrams || ''}
            onChange={(e) => setForm(prev => ({ ...prev, weightGrams: Number(e.target.value) }))}
            placeholder="Weight in grams"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={handleSelectImage}
            className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {form.imageUrl ? 'Change Image' : 'Select Image (Optional)'}
          </button>
          {form.imageUrl && (
            <div className="flex justify-center">
              <img src={form.imageUrl} alt="Preview" className="h-20 w-20 rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800" />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !form.uniqueName || !form.color || !form.rawMaterialId}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Element'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Edit Product Modal
// ──────────────────────────────────────────────────────────────

function EditProductModal({
  product,
  onClose,
  onSaved,
  onEditElements,
}: {
  product: ProductResponse;
  onClose: () => void;
  onSaved: () => void;
  onEditElements: () => void;
}) {
  const [form, setForm] = useState({
    serialNumber: product.serialNumber,
    category: product.category,
    label: product.label || '',
    unitsPerBox: product.unitsPerBox,
    imageUrl: product.imageUrl || '',
    boxRawMaterialId: product.boxRawMaterialId || '',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateProduct(product.id, {
        serialNumber: form.serialNumber,
        category: form.category,
        label: form.label,
        unitsPerBox: Number(form.unitsPerBox),
        imageUrl: form.imageUrl || undefined,
        boxRawMaterialId: form.boxRawMaterialId || null,
      });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || 'Failed to update product');
      }
    } catch {
      alert('Failed to update product');
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
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.serialNumber}
            onChange={(e) => setForm(prev => ({ ...prev, serialNumber: e.target.value }))}
            placeholder="Serial Number"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="Label (optional)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Category"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <input
            type="number"
            value={form.unitsPerBox}
            onChange={(e) => setForm(prev => ({ ...prev, unitsPerBox: Number(e.target.value) }))}
            placeholder="Units per Box"
            min="1"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <button
            type="button"
            onClick={handleSelectImage}
            className="w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {form.imageUrl ? 'Change Image' : 'Select Image'}
          </button>
          {form.imageUrl && (
            <div className="flex justify-center">
              <img src={form.imageUrl} alt="Preview" className="h-20 w-20 rounded-lg object-contain bg-zinc-100 dark:bg-zinc-800" />
            </div>
          )}

          {/* Box Type (Raw Material) */}
          {availableMaterials.length > 0 && (
            <div>
              <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Box Type (for assembly deduction)</label>
              <select
                value={form.boxRawMaterialId}
                onChange={(e) => setForm(prev => ({ ...prev, boxRawMaterialId: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">None (no box deduction)</option>
                {availableMaterials.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.stockQty.toLocaleString()} {m.unit})</option>
                ))}
              </select>
            </div>
          )}

          {/* Edit Elements button */}
          <button
            type="button"
            onClick={onEditElements}
            className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Edit Elements ({product.productElements?.length || 0})
          </button>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !form.serialNumber || !form.category}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Clone Product Modal
// ──────────────────────────────────────────────────────────────

function CloneProductModal({
  product,
  onClose,
  onCloned,
}: {
  product: ProductResponse;
  onClose: () => void;
  onCloned: () => void;
}) {
  const [newSerialNumber, setNewSerialNumber] = useState(product.serialNumber + '-COPY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.cloneProduct({
        sourceProductId: product.id,
        newSerialNumber,
      });
      if (result.success) {
        onCloned();
      } else {
        alert(result.error || 'Failed to clone product');
      }
    } catch {
      alert('Failed to clone product');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">Clone Product</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Create a copy of <span className="font-semibold text-zinc-700 dark:text-zinc-300">{product.serialNumber}</span> with all its elements.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={newSerialNumber}
            onChange={(e) => setNewSerialNumber(e.target.value)}
            placeholder="New Serial Number"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
          />
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !newSerialNumber}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Cloning...' : 'Clone Product'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Raw Material Card
// ──────────────────────────────────────────────────────────────

function RawMaterialCard({
  material,
  onAdjustStock,
  onEdit,
  onDelete,
}: {
  material: RawMaterialResponse;
  onAdjustStock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stockColor =
    material.stockQty <= 0
      ? 'text-red-600 dark:text-red-400'
      : material.stockQty < 100
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{material.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Unit: {material.unit}</p>
        </div>
        {/* Menu */}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-blue-600 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            title="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stock Display */}
      <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Current Stock</p>
        <p className={`text-2xl font-bold ${stockColor}`}>
          {material.stockQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          <span className="ml-1 text-sm font-normal text-zinc-400">{material.unit}</span>
        </p>
      </div>

      {/* Adjust Stock Button */}
      <button
        onClick={onAdjustStock}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Adjust Stock
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Create Raw Material Modal
// ──────────────────────────────────────────────────────────────

function CreateRawMaterialModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.createRawMaterial({ name: name.trim(), unit: unit.trim() || 'g' });
      if (result.success) {
        onCreated();
      } else {
        alert(result.error || 'Failed to create raw material');
      }
    } catch {
      alert('Failed to create raw material');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Add Raw Material</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Material name (e.g., PVC, PP, Cardboard Box A)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoFocus
          />
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Unit of measurement</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="units">Units</option>
              <option value="meters">Meters</option>
              <option value="liters">Liters</option>
              <option value="sheets">Sheets</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Add Material'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Adjust Stock Modal
// ──────────────────────────────────────────────────────────────

function AdjustStockModal({
  material,
  onClose,
  onAdjusted,
}: {
  material: RawMaterialResponse;
  onClose: () => void;
  onAdjusted: () => void;
}) {
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
      const result = await window.electron.adjustRawMaterialStock({
        rawMaterialId: material.id,
        changeAmount,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        onAdjusted();
      } else {
        alert(result.error || 'Failed to adjust stock');
      }
    } catch {
      alert('Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Adjust Stock</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          {material.name} — Current: {material.stockQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} {material.unit}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'add'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              + Add Stock
            </button>
            <button
              type="button"
              onClick={() => setMode('remove')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'remove'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              - Remove Stock
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Amount in ${material.unit}`}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-12 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              required
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{material.unit}</span>
          </div>

          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional — e.g., Shipment received)"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />

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
            <button
              type="submit"
              disabled={isSubmitting || !amount || Number(amount) <= 0}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Adjusting...' : mode === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Edit Raw Material Modal
// ──────────────────────────────────────────────────────────────

function EditRawMaterialModal({
  material,
  onClose,
  onSaved,
}: {
  material: RawMaterialResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(material.name);
  const [unit, setUnit] = useState(material.unit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.electron || !name.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await window.electron.updateRawMaterial(material.id, { name: name.trim(), unit: unit.trim() });
      if (result.success) {
        onSaved();
      } else {
        alert(result.error || 'Failed to update raw material');
      }
    } catch {
      alert('Failed to update raw material');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Raw Material</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Material name"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            required
            autoFocus
          />
          <div>
            <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Unit of measurement</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="units">Units</option>
              <option value="meters">Meters</option>
              <option value="liters">Liters</option>
              <option value="sheets">Sheets</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
