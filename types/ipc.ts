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
  shippedAt?: Date;
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
  changeAmount: number;
  reason: string;
}

// ============================================================================
// RAW MATERIAL DTOs
// ============================================================================

export interface CreateRawMaterialDTO {
  name: string;
  unit: string; // g, kg, units, meters, liters, etc.
  stockQty?: number;
}

export interface UpdateRawMaterialDTO {
  name?: string;
  unit?: string;
}

export interface AdjustRawMaterialStockDTO {
  rawMaterialId: string;
  changeAmount: number; // positive = add, negative = deduct
  reason?: string;
}

export interface RecordProductionDTO {
  orderId: string;
  elementId: string;
  amountProduced: number;
}

export interface RecordAssemblyDTO {
  orderId: string;
  productId: string;
  boxesAssembled: number;
}

// Stock overview per order
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
  boxesReady: number;
  unitsPerBox: number;
}

// Assembly view
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
  maxAssemblable: number;
}

// Excess assembly potential
export interface ExcessAssemblyData {
  productId: string;
  serialNumber: string;
  label: string;
  imageUrl: string | null;
  category: string;
  excessBoxes: number;
  locked: boolean; // true if product still has unfinished assembly in existing orders
}

// Aggregated element data for Production tab (grouped by element per order)
export interface ProductionElementGroup {
  elementId: string;
  elementName: string;
  elementLabel: string;
  color: string;
  color2: string | null;
  isDualColor: boolean;
  material: string;
  imageUrl: string | null;
  weightPerUnit: number;
  totalNeeded: number;
  totalProduced: number;
  remaining: number;
  allocated: number;
  excessAvailable: number;
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
  label?: string;
  unitsPerAssembly?: number;
  unitsPerBox: number;
  boxRawMaterialId?: string | null;
  imageUrl: string;
}

export interface UpdateProductDTO {
  serialNumber?: string;
  category?: string;
  label?: string;
  unitsPerBox?: number;
  boxRawMaterialId?: string | null;
  imageUrl?: string;
}

export interface CloneProductDTO {
  sourceProductId: string;
  newSerialNumber: string;
}

export interface CreateProductElementDTO {
  productId: string;
  elementId: string;
  quantityNeeded: number;
}

export interface CreateElementDTO {
  uniqueName: string;
  label?: string;
  color: string;
  color2?: string | null;
  isDualColor?: boolean;
  material: string;
  rawMaterialId?: string | null;
  weightGrams: number;
  imageUrl?: string;
}

export interface UpdateElementDTO {
  uniqueName?: string;
  label?: string;
  color?: string;
  color2?: string | null;
  isDualColor?: boolean;
  material?: string;
  rawMaterialId?: string | null;
  weightGrams?: number;
  imageUrl?: string | null;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface OrderResponse {
  id: string;
  orderNumber: number;
  clientName: string;
  createdAt: Date;
  shippedAt: Date | null;
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
  boxesAssembled: number;
  createdAt: Date;
  product?: ProductResponse;
}

export interface ProductResponse {
  id: string;
  serialNumber: string;
  category: string;
  label: string;
  unitsPerAssembly: number;
  unitsPerBox: number;
  boxRawMaterialId: string | null;
  imageUrl: string | null;
  createdAt: Date;
  productElements?: ProductElementResponse[];
  boxRawMaterial?: RawMaterialResponse | null;
}

export interface ProductElementResponse {
  id: string;
  productId: string;
  elementId: string;
  quantityNeeded: number;
  element?: ElementResponse;
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
  quantityNeeded: number;
  quantityProduced: number;
  totalWeightGrams: number;
  element?: ElementResponse;
}

export interface ElementResponse {
  id: string;
  uniqueName: string;
  label: string;
  color: string;
  color2: string | null;
  isDualColor: boolean;
  material: string;
  rawMaterialId: string | null;
  weightGrams: number;
  imageUrl: string | null;
  createdAt: Date;
  rawMaterial?: RawMaterialResponse | null;
}

export interface InventoryResponse {
  id: string;
  elementId: string;
  totalAmount: number;
  updatedAt: Date;
  element?: ElementResponse;
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
  changeAmount: number;
  reason: string;
  createdAt: Date;
  element?: ElementResponse;
}

// ============================================================================
// RAW MATERIAL RESPONSES
// ============================================================================

export interface RawMaterialResponse {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  createdAt: Date;
}

export interface RawMaterialTransactionResponse {
  id: string;
  rawMaterialId: string;
  changeAmount: number;
  reason: string;
  createdAt: Date;
  rawMaterial?: RawMaterialResponse;
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
  addOrderItem: (orderId: string, data: { productId: string; boxesNeeded: number }) => Promise<IPCResponse<OrderResponse>>;
  updateOrderItem: (itemId: string, data: { boxesNeeded: number }) => Promise<IPCResponse<OrderResponse>>;
  removeOrderItem: (itemId: string) => Promise<IPCResponse<OrderResponse>>;
  deleteOrder: (id: string) => Promise<IPCResponse<{ id: string }>>;
  checkMaterialAvailability: (orderId: string) => Promise<IPCResponse<{
    shortages: Array<{
      materialName: string;
      unit: string;
      totalNeeded: number;
      currentStock: number;
      shortage: number;
    }>;
    sufficient: boolean;
  }>>;

  // ========== MANUFACTURING ==========
  getManufacturingOrders: () => Promise<IPCResponse<ManufacturingOrderResponse[]>>;
  getManufacturingOrderById: (id: string) => Promise<IPCResponse<ManufacturingOrderResponse | null>>;
  createManufacturingOrder: (data: CreateManufacturingOrderDTO) => Promise<IPCResponse<ManufacturingOrderResponse>>;
  updateManufacturingOrder: (id: string, data: UpdateManufacturingOrderDTO) => Promise<IPCResponse<ManufacturingOrderResponse>>;
  deleteManufacturingOrder: (id: string) => Promise<IPCResponse<{ id: string }>>;

  // ========== MATERIAL REQUIREMENTS ==========
  getMaterialRequirements: (manufacturingOrderId: string) => Promise<IPCResponse<MaterialRequirementResponse[]>>;
  generateMaterialRequirements: (manufacturingOrderId: string) => Promise<IPCResponse<MaterialRequirementResponse[]>>;

  // ========== PRODUCTION ==========
  getProductionOrders: () => Promise<IPCResponse<ProductionOrderData[]>>;
  recordProduction: (data: RecordProductionDTO) => Promise<IPCResponse<{ remaining: number; orderComplete: boolean }>>;
  applyInventoryToOrder: (data: { orderId: string }) => Promise<IPCResponse<{ orderId: string; applied: Array<{ elementId: string; amountApplied: number }>; orderComplete: boolean }>>;

  // ========== ASSEMBLY ==========
  getAssemblyOrders: () => Promise<IPCResponse<AssemblyOrderData[]>>;
  recordAssembly: (data: RecordAssemblyDTO) => Promise<IPCResponse<{ boxesAssembled: number; remaining: number }>>;
  getExcessAssembly: () => Promise<IPCResponse<ExcessAssemblyData[]>>;
  recordExcessAssembly: (data: { productId: string; boxes: number }) => Promise<IPCResponse<{ productId: string; stockBoxedAmount: number }>>;

  // ========== STOCK ORDERS ==========
  getStockOrders: () => Promise<IPCResponse<StockOrderData[]>>;
  applyStockToOrder: (data: { orderId: string; productId: string; boxes: number }) => Promise<IPCResponse<{ orderId: string; productId: string; boxesApplied: number; newBoxesAssembled: number; newStockAmount: number }>>;

  // ========== INVENTORY ==========
  getInventory: () => Promise<IPCResponse<InventoryResponse[]>>;
  getInventoryByElement: (elementId: string) => Promise<IPCResponse<InventoryResponse | null>>;
  adjustInventory: (data: CreateInventoryTransactionDTO) => Promise<IPCResponse<InventoryResponse>>;
  deleteInventory: (id: string) => Promise<IPCResponse<{ id: string }>>;
  getInventoryTransactions: () => Promise<IPCResponse<InventoryTransactionResponse[]>>;

  // ========== PRODUCTS ==========
  getProducts: () => Promise<IPCResponse<ProductResponse[]>>;
  getProductById: (id: string) => Promise<IPCResponse<ProductResponse | null>>;
  createProduct: (data: CreateProductDTO) => Promise<IPCResponse<ProductResponse>>;
  updateProduct: (id: string, data: UpdateProductDTO) => Promise<IPCResponse<ProductResponse>>;
  cloneProduct: (data: CloneProductDTO) => Promise<IPCResponse<ProductResponse>>;
  addProductElement: (data: CreateProductElementDTO) => Promise<IPCResponse<ProductElementResponse>>;
  removeProductElement: (id: string) => Promise<IPCResponse<{ id: string }>>;
  deleteProduct: (id: string) => Promise<IPCResponse<{ id: string }>>;

  // ========== PRODUCT STOCK ==========
  getProductStock: () => Promise<IPCResponse<ProductStockResponse[]>>;
  getProductStockById: (productId: string) => Promise<IPCResponse<ProductStockResponse | null>>;

  // ========== ELEMENTS ==========
  getElements: () => Promise<IPCResponse<ElementResponse[]>>;
  createElement: (data: CreateElementDTO) => Promise<IPCResponse<ElementResponse>>;
  updateElement: (id: string, data: UpdateElementDTO) => Promise<IPCResponse<ElementResponse>>;
  deleteElement: (id: string) => Promise<IPCResponse<{ id: string }>>;

  // ========== RAW MATERIALS (STORAGE) ==========
  getRawMaterials: () => Promise<IPCResponse<RawMaterialResponse[]>>;
  createRawMaterial: (data: CreateRawMaterialDTO) => Promise<IPCResponse<RawMaterialResponse>>;
  updateRawMaterial: (id: string, data: UpdateRawMaterialDTO) => Promise<IPCResponse<RawMaterialResponse>>;
  deleteRawMaterial: (id: string) => Promise<IPCResponse<{ id: string }>>;
  adjustRawMaterialStock: (data: AdjustRawMaterialStockDTO) => Promise<IPCResponse<RawMaterialResponse>>;
  getRawMaterialTransactions: (rawMaterialId?: string) => Promise<IPCResponse<RawMaterialTransactionResponse[]>>;

  // ========== DIALOG ==========
  selectImage: () => Promise<IPCResponse<string | null>>;

  // ========== SYSTEM ==========
  ping: () => Promise<string>;

  // ========== AUTO-UPDATE ==========
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ status: string; version?: string; error?: string }>;
  quitAndInstall: () => Promise<void>;
  postponeUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (data: { status: string; version?: string; percent?: number; error?: string }) => void) => () => void;
}

// ============================================================================
// NATIVE ELECTRON API (exposed via preload as window.electronAPI)
// Only 5 methods are available natively via IPC; all data ops use HTTP.
// ============================================================================

export interface NativeElectronAPI {
  getApiPort: () => Promise<number>;
  getAppVersion: () => Promise<string>;
  selectImage: () => Promise<{ success: boolean; data?: string | null; error?: string }>;
  onUpdateStatus: (callback: (status: unknown) => void) => () => void;
  quitAndInstall: () => Promise<void>;
  postponeUpdate: () => Promise<void>;
}

// ============================================================================
// GLOBAL TYPE AUGMENTATION
// window.electron    — HTTP-backed bridge (populated by api-bridge.ts)
// window.electronAPI — Native IPC methods (populated by preload/index.ts)
// ============================================================================

declare global {
  interface Window {
    /** HTTP-backed API bridge — all data operations (populated by api-bridge.ts at startup) */
    electron: ElectronAPI;
    /** Native Electron IPC methods — only available inside Electron (populated by preload) */
    electronAPI: NativeElectronAPI;
  }
}
