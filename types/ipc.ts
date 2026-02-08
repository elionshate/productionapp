/**
 * IPC Type Definitions (Shared Contract)
 * 
 * This file defines the contract between the Renderer (Next.js UI) and Main (Electron Backend).
 * ALL database operations MUST go through this IPC layer due to static export constraints.
 * 
 * Architecture:
 * - Renderer: React components → hooks/use-electron.ts → window.electron (preload)
 * - Main: IPC handlers → Prisma Client → SQLite/PostgreSQL
 */

// ============================================================================
// AUTH DTOs
// ============================================================================

export interface RegisterDTO {
  username: string;
  password: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface UserResponse {
  id: string;
  username: string;
  createdAt: Date;
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

export interface CreateOrderDTO {
  clientName: string;
  status?: 'pending' | 'in_production'; // Default: 'pending'
  notes?: string;
  items: {
    productId: string;
    boxesNeeded: number;
  }[];
}

export interface UpdateOrderDTO {
  status?: 'pending' | 'in_production' | 'shipped';
  notes?: string;
}

export interface CreateManufacturingOrderDTO {
  orderId: string;
  productId: string;
  quantityToMake: number;
}

export interface UpdateManufacturingOrderDTO {
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface CreateInventoryTransactionDTO {
  elementId: string;
  colorId: string;
  changeAmount: number;
  reason: string;
}

export interface RecordProductionDTO {
  orderId: string;
  elementId: string;
  colorId: string;
  amountProduced: number;
}

export interface RecordAssemblyDTO {
  orderId: string;
  productId: string;
  boxesAssembled: number;
}

// Stock overview per order — shows product-level completion (n/m)
export interface StockOrderData {
  orderId: string;
  orderNumber: number;
  clientName: string;
  createdAt: Date;
  status: string;
  products: StockProductEntry[];
}

export interface StockProductEntry {
  productId: string;
  serialNumber: string;
  imageUrl: string | null;
  category: string;
  boxesNeeded: number;
  boxesReady: number;  // from ProductStock or OrderItem tracking
  unitsPerBox: number;
}

// Assembly view — orders in production with product box counts
export interface AssemblyOrderData {
  orderId: string;
  orderNumber: number;
  clientName: string;
  createdAt: Date;
  notes: string | null;
  products: AssemblyProductEntry[];
}

export interface AssemblyProductEntry {
  orderItemId: string;
  productId: string;
  serialNumber: string;
  imageUrl: string | null;
  category: string;
  boxesNeeded: number;
  boxesAssembled: number;
  remaining: number;
  unitsPerBox: number;
}

// Aggregated element data for the Production tab (grouped by element+color per order)
export interface ProductionElementGroup {
  elementId: string;
  colorId: string;
  elementName: string;
  colorName: string;
  material: string;
  imageUrl: string | null;
  weightPerUnit: number;
  totalNeeded: number;
  totalProduced: number;
  remaining: number;
  totalWeightGrams: number;
}

export interface ProductionOrderData {
  orderId: string;
  orderNumber: number;
  clientName: string;
  createdAt: Date;
  notes: string | null;
  elements: ProductionElementGroup[];
}

export interface CreateProductDTO {
  serialNumber: string;
  category: string;
  unitsPerAssembly?: number; // Defaults to 1 (product is a unit itself)
  unitsPerBox: number;
  imageUrl: string; // Base64 data URL from file picker — mandatory
}

export interface CreateProductElementDTO {
  productId: string;
  elementId: string;
  colorId: string;
  quantityNeeded: number;
}

export interface CreateColorDTO {
  colorName: string;
}

export interface CreateElementDTO {
  uniqueName: string;
  material: string;
  weightGrams: number;
  imageUrl?: string;
}

// ============================================================================
// RESPONSE TYPES (Matches Prisma Client Output)
// ============================================================================

export interface OrderResponse {
  id: string;
  orderNumber: number;
  clientName: string;
  createdAt: Date;
  status: string;
  notes: string | null;
  orderItems?: OrderItemResponse[];
  manufacturingOrders?: ManufacturingOrderResponse[];
}

export interface OrderItemResponse {
  id: string;
  orderId: string;
  productId: string;
  boxesNeeded: number;
  createdAt: Date;
  product?: ProductResponse;
}

export interface ProductResponse {
  id: string;
  serialNumber: string;
  category: string;
  unitsPerAssembly: number;
  unitsPerBox: number;
  imageUrl: string | null;
  createdAt: Date;
  productElements?: ProductElementResponse[];
}

export interface ProductElementResponse {
  id: string;
  productId: string;
  elementId: string;
  colorId: string;
  quantityNeeded: number;
  element?: ElementResponse;
  color?: ColorResponse;
}

export interface ManufacturingOrderResponse {
  id: string;
  orderId: string;
  productId: string;
  quantityToMake: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requirements?: MaterialRequirementResponse[];
  product?: ProductResponse;
}

export interface MaterialRequirementResponse {
  id: string;
  manufacturingOrderId: string;
  elementId: string;
  colorId: string;
  quantityNeeded: number;
  quantityProduced: number;
  totalWeightGrams: number;
  element?: ElementResponse;
  color?: ColorResponse;
}

export interface ElementResponse {
  id: string;
  uniqueName: string;
  material: string;
  weightGrams: number;
  imageUrl: string | null;
  createdAt: Date;
}

export interface ColorResponse {
  id: string;
  colorName: string;
  createdAt: Date;
}

export interface InventoryResponse {
  id: string;
  elementId: string;
  colorId: string;
  totalAmount: number;
  updatedAt: Date;
  element?: ElementResponse;
  color?: ColorResponse;
}

export interface ProductStockResponse {
  id: string;
  productId: string;
  stockBoxedAmount: number;
  updatedAt: Date;
  product?: ProductResponse;
}

export interface InventoryTransactionResponse {
  id: string;
  elementId: string | null;
  colorId: string | null;
  changeAmount: number;
  reason: string;
  createdAt: Date;
  element?: ElementResponse;
  color?: ColorResponse;
}

// ============================================================================
// ERROR RESPONSE (Standardized)
// ============================================================================

export interface IPCError {
  success: false;
  error: string;
  code?: string;
}

export interface IPCSuccess<T> {
  success: true;
  data: T;
}

export type IPCResponse<T> = IPCSuccess<T> | IPCError;

// ============================================================================
// ELECTRON API INTERFACE (Window.electron)
// ============================================================================

export interface ElectronAPI {
  // ========== AUTH ==========
  hasUsers: () => Promise<IPCResponse<boolean>>;
  register: (data: RegisterDTO) => Promise<IPCResponse<UserResponse>>;
  login: (data: LoginDTO) => Promise<IPCResponse<UserResponse>>;

  // ========== ORDERS ==========
  getOrders: () => Promise<IPCResponse<OrderResponse[]>>;
  getOrderById: (id: string) => Promise<IPCResponse<OrderResponse | null>>;
  createOrder: (data: CreateOrderDTO) => Promise<IPCResponse<OrderResponse>>;
  updateOrder: (id: string, data: UpdateOrderDTO) => Promise<IPCResponse<OrderResponse>>;
  deleteOrder: (id: string) => Promise<IPCResponse<{ id: string }>>;

  // ========== MANUFACTURING ==========
  getManufacturingOrders: () => Promise<IPCResponse<ManufacturingOrderResponse[]>>;
  getManufacturingOrderById: (id: string) => Promise<IPCResponse<ManufacturingOrderResponse | null>>;
  createManufacturingOrder: (data: CreateManufacturingOrderDTO) => Promise<IPCResponse<ManufacturingOrderResponse>>;
  updateManufacturingOrder: (id: string, data: UpdateManufacturingOrderDTO) => Promise<IPCResponse<ManufacturingOrderResponse>>;
  deleteManufacturingOrder: (id: string) => Promise<IPCResponse<{ id: string }>>;
  
  // ========== MATERIAL REQUIREMENTS (Pick Lists) ==========
  getMaterialRequirements: (manufacturingOrderId: string) => Promise<IPCResponse<MaterialRequirementResponse[]>>;
  generateMaterialRequirements: (manufacturingOrderId: string) => Promise<IPCResponse<MaterialRequirementResponse[]>>;

  // ========== PRODUCTION ==========
  getProductionOrders: () => Promise<IPCResponse<ProductionOrderData[]>>;
  recordProduction: (data: RecordProductionDTO) => Promise<IPCResponse<{ remaining: number }>>;

  // ========== ASSEMBLY ==========
  getAssemblyOrders: () => Promise<IPCResponse<AssemblyOrderData[]>>;
  recordAssembly: (data: RecordAssemblyDTO) => Promise<IPCResponse<{ boxesAssembled: number; remaining: number }>>;

  // ========== STOCK ORDERS ==========
  getStockOrders: () => Promise<IPCResponse<StockOrderData[]>>;

  // ========== INVENTORY ==========
  getInventory: () => Promise<IPCResponse<InventoryResponse[]>>;
  getInventoryByElement: (elementId: string, colorId: string) => Promise<IPCResponse<InventoryResponse | null>>;
  adjustInventory: (data: CreateInventoryTransactionDTO) => Promise<IPCResponse<InventoryResponse>>;
  getInventoryTransactions: () => Promise<IPCResponse<InventoryTransactionResponse[]>>;

  // ========== PRODUCTS ==========
  getProducts: () => Promise<IPCResponse<ProductResponse[]>>;
  getProductById: (id: string) => Promise<IPCResponse<ProductResponse | null>>;
  createProduct: (data: CreateProductDTO) => Promise<IPCResponse<ProductResponse>>;
  addProductElement: (data: CreateProductElementDTO) => Promise<IPCResponse<ProductElementResponse>>;
  deleteProduct: (id: string) => Promise<IPCResponse<{ id: string }>>;

  // ========== PRODUCT STOCK ==========
  getProductStock: () => Promise<IPCResponse<ProductStockResponse[]>>;
  getProductStockById: (productId: string) => Promise<IPCResponse<ProductStockResponse | null>>;

  // ========== COLORS ==========
  getColors: () => Promise<IPCResponse<ColorResponse[]>>;
  createColor: (data: CreateColorDTO) => Promise<IPCResponse<ColorResponse>>;

  // ========== ELEMENTS ==========
  getElements: () => Promise<IPCResponse<ElementResponse[]>>;
  createElement: (data: CreateElementDTO) => Promise<IPCResponse<ElementResponse>>;

  // ========== DIALOG ==========
  selectImage: () => Promise<IPCResponse<string | null>>;

  // ========== SYSTEM ==========
  ping: () => Promise<string>;

  // ========== AUTO-UPDATE ==========
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ status: string; version?: string; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; error?: string }) => void) => () => void;
}

// ============================================================================
// GLOBAL TYPE AUGMENTATION (for window.electron)
// ============================================================================

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
