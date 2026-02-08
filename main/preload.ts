import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../types/ipc';

/**
 * Secure IPC Bridge (Preload Script)
 * 
 * This script runs in an isolated context and exposes ONLY the necessary
 * APIs to the renderer process. NEVER expose the entire Node.js API.
 * 
 * Security Rules:
 * - DO NOT expose ipcRenderer directly
 * - DO NOT expose Node.js modules
 * - ONLY expose specific, typed functions
 * - ALL database operations go through IPC handlers in main process
 * 
 * Architecture:
 * Renderer (React) → window.electron → contextBridge → ipcRenderer → Main Process → Prisma
 */

const electronAPI: ElectronAPI = {
  // ========== AUTH ==========
  hasUsers: () => ipcRenderer.invoke('auth:hasUsers'),
  register: (data) => ipcRenderer.invoke('auth:register', data),
  login: (data) => ipcRenderer.invoke('auth:login', data),

  // ========== ORDERS ==========
  getOrders: () => ipcRenderer.invoke('orders:getAll'),
  getOrderById: (id: string) => ipcRenderer.invoke('orders:getById', id),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),

  // ========== MANUFACTURING ==========
  getManufacturingOrders: () => ipcRenderer.invoke('manufacturing:getAll'),
  getManufacturingOrderById: (id) => ipcRenderer.invoke('manufacturing:getById', id),
  createManufacturingOrder: (data) => ipcRenderer.invoke('manufacturing:create', data),
  updateManufacturingOrder: (id, data) => ipcRenderer.invoke('manufacturing:update', id, data),
  deleteManufacturingOrder: (id) => ipcRenderer.invoke('manufacturing:delete', id),

  // ========== MATERIAL REQUIREMENTS (Pick Lists) ==========
  getMaterialRequirements: (manufacturingOrderId) => 
    ipcRenderer.invoke('requirements:getByManufacturingOrder', manufacturingOrderId),
  generateMaterialRequirements: (manufacturingOrderId) => 
    ipcRenderer.invoke('requirements:generate', manufacturingOrderId),

  // ========== PRODUCTION ==========
  getProductionOrders: () => ipcRenderer.invoke('production:getInProduction'),
  recordProduction: (data) => ipcRenderer.invoke('production:recordProduction', data),

  // ========== ASSEMBLY ==========
  getAssemblyOrders: () => ipcRenderer.invoke('assembly:getOrders'),
  recordAssembly: (data) => ipcRenderer.invoke('assembly:record', data),

  // ========== STOCK ORDERS ==========
  getStockOrders: () => ipcRenderer.invoke('stock:getOrders'),

  // ========== INVENTORY ==========
  getInventory: () => ipcRenderer.invoke('inventory:getAll'),
  getInventoryByElement: (elementId, colorId) => 
    ipcRenderer.invoke('inventory:getByElement', elementId, colorId),
  adjustInventory: (data) => ipcRenderer.invoke('inventory:adjust', data),
  getInventoryTransactions: () => ipcRenderer.invoke('inventory:getTransactions'),

  // ========== PRODUCTS ==========
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  addProductElement: (data) => ipcRenderer.invoke('products:addElement', data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // ========== PRODUCT STOCK ==========
  getProductStock: () => ipcRenderer.invoke('productStock:getAll'),
  getProductStockById: (productId) => ipcRenderer.invoke('productStock:getById', productId),

  // ========== COLORS ==========
  getColors: () => ipcRenderer.invoke('colors:getAll'),
  createColor: (data) => ipcRenderer.invoke('colors:create', data),

  // ========== ELEMENTS ==========
  getElements: () => ipcRenderer.invoke('elements:getAll'),
  createElement: (data) => ipcRenderer.invoke('elements:create', data),

  // ========== DIALOG ==========
  selectImage: () => ipcRenderer.invoke('dialog:selectImage'),

  // ========== SYSTEM ==========
  ping: () => ipcRenderer.invoke('ping'),

  // ========== AUTO-UPDATE ==========
  getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; version?: string; percent?: number; error?: string }) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => { ipcRenderer.removeListener('update-status', handler); };
  },
};

// Expose API to renderer process under window.electron
contextBridge.exposeInMainWorld('electron', electronAPI);
