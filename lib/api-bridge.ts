/**
 * API Bridge — Compatibility Layer
 *
 * Maps the old `window.electron` interface (IPC-based) to the new HTTP API client.
 * This allows ALL existing frontend code to work without modification while the
 * backend architecture has been refactored from IPC → HTTP (NestJS).
 *
 * Architecture:
 *   Old: Renderer → window.electron.X() → IPC → Electron Main → Prisma
 *   New: Renderer → window.electron.X() → HTTP fetch → NestJS → Prisma
 *        (Native ops like selectImage still use IPC via electronAPI)
 */
import * as api from './api-client';

/**
 * Initialize window.electron with HTTP-backed implementations.
 * Call this once during app startup (e.g., in layout.tsx or a top-level useEffect).
 */
export function initializeApiBridge() {
  if (typeof window === 'undefined') return;

  // If already initialized, skip
  if ((window as any).__apiBridgeInitialized) return;

  const bridge = {
    // ========== AUTH ==========
    hasUsers: () => api.hasUsers(),
    register: (data: { username: string; password: string }) => api.register(data),
    login: (data: { username: string; password: string }) => api.login(data),

    // ========== ELEMENTS ==========
    getElements: () => api.getElements(),
    createElement: (data: any) => api.createElement(data),
    updateElement: (id: string, data: any) => api.updateElement(id, data),
    deleteElement: (id: string) => api.deleteElement(id),

    // ========== PRODUCTS ==========
    getProducts: () => api.getProducts(),
    getProductById: (id: string) => api.getProductById(id),
    createProduct: (data: any) => api.createProduct(data),
    updateProduct: (id: string, data: any) => api.updateProduct(id, data),
    deleteProduct: (id: string) => api.deleteProduct(id),
    cloneProduct: (data: { sourceProductId: string; newSerialNumber: string }) =>
      api.cloneProduct(data),
    addProductElement: (data: { productId: string; elementId: string; quantityNeeded: number }) =>
      api.addProductElement(data),
    removeProductElement: (id: string) => api.removeProductElement(id),

    // ========== ORDERS ==========
    getOrders: () => api.getOrders(),
    getOrderById: (id: string) => api.getOrderById(id),
    createOrder: (data: any) => api.createOrder(data),
    updateOrder: (id: string, data: any) => api.updateOrder(id, data),
    addOrderItem: (orderId: string, data: { productId: string; boxesNeeded: number }) => api.addOrderItem(orderId, data),
    updateOrderItem: (itemId: string, data: { boxesNeeded: number }) => api.updateOrderItem(itemId, data),
    removeOrderItem: (itemId: string) => api.removeOrderItem(itemId),
    deleteOrder: (id: string) => api.deleteOrder(id),
    checkMaterialAvailability: (orderId: string) => api.checkMaterialAvailability(orderId),

    // ========== MANUFACTURING ==========
    getManufacturingOrders: () => api.getManufacturingOrders(),
    getManufacturingOrderById: (id: string) => api.getManufacturingOrderById(id),
    createManufacturingOrder: (data: any) => api.createManufacturingOrder(data),
    updateManufacturingOrder: (id: string, data: any) =>
      api.updateManufacturingOrder(id, data),
    deleteManufacturingOrder: (id: string) => api.deleteManufacturingOrder(id),

    // ========== MATERIAL REQUIREMENTS ==========
    getMaterialRequirements: (manufacturingOrderId: string) =>
      api.getMaterialRequirements(manufacturingOrderId),
    generateMaterialRequirements: (manufacturingOrderId: string) =>
      api.generateMaterialRequirements(manufacturingOrderId),

    // ========== PRODUCTION ==========
    getProductionOrders: () => api.getProductionOrders(),
    recordProduction: (data: { orderId: string; elementId: string; amountProduced: number }) =>
      api.recordProduction(data),
    applyInventoryToOrder: (data: { orderId: string }) =>
      api.applyInventoryToOrder(data),

    // ========== ASSEMBLY ==========
    getAssemblyOrders: () => api.getAssemblyOrders(),
    recordAssembly: (data: { orderId: string; productId: string; boxesAssembled: number }) =>
      api.recordAssembly(data),
    getExcessAssembly: () => api.getExcessAssembly(),
    recordExcessAssembly: (data: { productId: string; boxes: number }) =>
      api.recordExcessAssembly(data),

    // ========== INVENTORY ==========
    getInventory: () => api.getInventory(),
    getInventoryByElement: (elementId: string) => api.getInventoryByElement(elementId),
    adjustInventory: (data: { elementId: string; changeAmount: number; reason: string }) =>
      api.adjustInventory(data),
    deleteInventory: (id: string) => api.deleteInventory(id),
    getInventoryTransactions: () => api.getInventoryTransactions(),

    // ========== STOCK ==========
    getStockOrders: () => api.getStockOrders(),
    getProductStock: () => api.getProductStock(),
    getProductStockById: (productId: string) => api.getProductStockById(productId),
    applyStockToOrder: (data: { orderId: string; productId: string; boxes: number }) =>
      api.applyStockToOrder(data),

    // ========== RAW MATERIALS ==========
    getRawMaterials: () => api.getRawMaterials(),
    createRawMaterial: (data: { name: string; unit: string }) => api.createRawMaterial(data),
    updateRawMaterial: (id: string, data: { name?: string; unit?: string }) =>
      api.updateRawMaterial(id, data),
    deleteRawMaterial: (id: string) => api.deleteRawMaterial(id),
    adjustRawMaterialStock: (data: {
      rawMaterialId: string;
      changeAmount: number;
      reason?: string;
    }) => api.adjustRawMaterialStock(data),
    getRawMaterialTransactions: (rawMaterialId?: string) =>
      api.getRawMaterialTransactions(rawMaterialId),

    // ========== NATIVE ELECTRON (IPC passthrough) ==========
    getAppVersion: () => api.getAppVersion(),
    selectImage: () => api.selectImage(),
    onUpdateStatus: (callback: (data: any) => void) => {
      api.onUpdateStatus(callback);
      // Return a no-op unsubscribe for compatibility
      return () => {};
    },
    quitAndInstall: () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.quitAndInstall) {
          electronAPI.quitAndInstall();
        }
      } catch {
        // not in Electron
      }
    },
    postponeUpdate: () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.postponeUpdate) {
          electronAPI.postponeUpdate();
        }
      } catch {
        // not in Electron
      }
    },
  };

  (window as any).electron = bridge;
  (window as any).__apiBridgeInitialized = true;

  console.log('[API Bridge] Initialized — window.electron now uses HTTP API');
}
