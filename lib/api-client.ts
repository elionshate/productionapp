/**
 * API Client for the Production App
 *
 * Replaces all window.electron IPC calls with HTTP fetch to the local NestJS server.
 * The API port is obtained from the Electron preload (window.electronAPI.getApiPort()).
 *
 * For dev mode without Electron, falls back to localhost:4123.
 */

let cachedBaseUrl: string | null = null;

async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;

  try {
    // In Electron, get port from preload
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getApiPort) {
      const port = await electronAPI.getApiPort();
      cachedBaseUrl = `http://127.0.0.1:${port}/api`;
      return cachedBaseUrl;
    }
  } catch {
    // fallback
  }

  // Dev fallback
  cachedBaseUrl = 'http://127.0.0.1:4123/api';
  return cachedBaseUrl;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return json as ApiResponse<T>;
}

function get<T>(path: string) {
  return request<T>('GET', path);
}
function post<T>(path: string, body?: unknown) {
  return request<T>('POST', path, body);
}
function put<T>(path: string, body?: unknown) {
  return request<T>('PUT', path, body);
}
function del<T>(path: string) {
  return request<T>('DELETE', path);
}

// ========== AUTH ==========
export const hasUsers = () => get<boolean>('/auth/has-users');
export const register = (data: { username: string; password: string }) =>
  post('/auth/register', data);
export const login = (data: { username: string; password: string }) =>
  post('/auth/login', data);

// ========== ELEMENTS ==========
export const getElements = () => get('/elements');
export const createElement = (data: {
  uniqueName: string;
  label?: string;
  color: string;
  color2?: string;
  isDualColor: boolean;
  material: string;
  weightGrams: number;
  imageUrl?: string;
  rawMaterialId?: string;
}) => post('/elements', data);
export const updateElement = (
  id: string,
  data: {
    uniqueName?: string;
    label?: string;
    color?: string;
    color2?: string;
    isDualColor?: boolean;
    material?: string;
    weightGrams?: number;
    imageUrl?: string;
    rawMaterialId?: string;
  },
) => put(`/elements/${id}`, data);
export const deleteElement = (id: string) => del(`/elements/${id}`);

// ========== PRODUCTS ==========
export const getProducts = () => get('/products');
export const getProductById = (id: string) => get(`/products/${id}`);
export const createProduct = (data: {
  serialNumber: string;
  category: string;
  label?: string;
  unitsPerBox: number;
  imageUrl?: string;
  boxRawMaterialId?: string;
}) => post('/products', data);
export const updateProduct = (
  id: string,
  data: {
    serialNumber?: string;
    category?: string;
    label?: string;
    unitsPerBox?: number;
    imageUrl?: string;
    boxRawMaterialId?: string;
  },
) => put(`/products/${id}`, data);
export const deleteProduct = (id: string) => del(`/products/${id}`);
export const cloneProduct = (data: { sourceProductId: string; newSerialNumber: string }) =>
  post('/products/clone', data);
export const addProductElement = (data: {
  productId: string;
  elementId: string;
  quantityNeeded: number;
}) => post('/products/add-element', data);
export const removeProductElement = (productElementId: string) =>
  del(`/products/remove-element/${productElementId}`);

// ========== ORDERS ==========
export const getOrders = () => get('/orders');
export const getOrderById = (id: string) => get(`/orders/${id}`);
export const createOrder = (data: {
  clientName: string;
  status?: string;
  notes?: string;
  items: Array<{ productId: string; boxesNeeded: number }>;
}) => post('/orders', data);
export const updateOrder = (id: string, data: { status?: string; notes?: string }) =>
  put(`/orders/${id}`, data);
export const addOrderItem = (orderId: string, data: { productId: string; boxesNeeded: number }) =>
  post(`/orders/${orderId}/items`, data);
export const updateOrderItem = (itemId: string, data: { boxesNeeded: number }) =>
  put(`/orders/items/${itemId}`, data);
export const removeOrderItem = (itemId: string) =>
  del(`/orders/items/${itemId}`);
export const deleteOrder = (id: string) => del(`/orders/${id}`);
export const checkMaterialAvailability = (orderId: string) =>
  get(`/orders/${orderId}/material-check`);

// ========== MANUFACTURING ==========
export const getManufacturingOrders = () => get('/manufacturing');
export const getManufacturingOrderById = (id: string) => get(`/manufacturing/${id}`);
export const createManufacturingOrder = (data: {
  orderId: string;
  elementId: string;
  quantityNeeded: number;
}) => post('/manufacturing', data);
export const updateManufacturingOrder = (
  id: string,
  data: { status?: string; quantityNeeded?: number; quantityProduced?: number },
) => put(`/manufacturing/${id}`, data);
export const deleteManufacturingOrder = (id: string) => del(`/manufacturing/${id}`);

// ========== MATERIAL REQUIREMENTS ==========
export const getMaterialRequirements = (manufacturingOrderId: string) =>
  get(`/manufacturing/${manufacturingOrderId}/requirements`);
export const generateMaterialRequirements = (manufacturingOrderId: string) =>
  post(`/manufacturing/${manufacturingOrderId}/generate-requirements`);

// ========== PRODUCTION ==========
export const getProductionOrders = () => get('/production');
export const recordProduction = (data: {
  orderId: string;
  elementId: string;
  amountProduced: number;
}) => post('/production/record', data);

// ========== ASSEMBLY ==========
export const getAssemblyOrders = () => get('/assembly');
export const recordAssembly = (data: {
  orderId: string;
  productId: string;
  boxesAssembled: number;
}) => post('/assembly/record', data);
export const getExcessAssembly = () => get('/assembly/excess');
export const recordExcessAssembly = (data: {
  productId: string;
  boxes: number;
}) => post('/assembly/record-excess', data);

// ========== INVENTORY ==========
export const getInventory = () => get('/inventory');
export const getInventoryTransactions = () => get('/inventory/transactions');
export const getInventoryByElement = (elementId: string) =>
  get(`/inventory/by-element/${elementId}`);
export const adjustInventory = (data: {
  elementId: string;
  changeAmount: number;
  reason?: string;
}) => post('/inventory/adjust', data);
export const deleteInventory = (id: string) => del(`/inventory/${id}`);

// ========== STOCK ==========
export const getStockOrders = () => get('/stock/orders');
export const getProductStock = () => get('/stock/products');
export const getProductStockById = (productId: string) =>
  get(`/stock/products/${productId}`);
export const applyStockToOrder = (data: { orderId: string; productId: string; boxes: number }) =>
  post('/stock/apply-to-order', data);

// ========== RAW MATERIALS ==========
export const getRawMaterials = () => get('/raw-materials');
export const createRawMaterial = (data: { name: string; unit: string }) =>
  post('/raw-materials', data);
export const updateRawMaterial = (id: string, data: { name?: string; unit?: string }) =>
  put(`/raw-materials/${id}`, data);
export const deleteRawMaterial = (id: string) => del(`/raw-materials/${id}`);
export const adjustRawMaterialStock = (data: {
  rawMaterialId: string;
  changeAmount: number;
  reason?: string;
}) => post('/raw-materials/adjust', data);
export const getRawMaterialTransactions = (rawMaterialId?: string) =>
  get(`/raw-materials/transactions${rawMaterialId ? `?rawMaterialId=${rawMaterialId}` : ''}`);

// ========== NATIVE ELECTRON (IPC) ==========
export const selectImage = async (): Promise<ApiResponse<string | null>> => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.selectImage) {
      return await electronAPI.selectImage();
    }
    return { success: false, error: 'selectImage is only available in Electron' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

export const getAppVersion = async (): Promise<string> => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getAppVersion) {
      return await electronAPI.getAppVersion();
    }
    return 'dev';
  } catch {
    return 'dev';
  }
};

export const onUpdateStatus = (callback: (status: any) => void) => {
  try {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onUpdateStatus) {
      electronAPI.onUpdateStatus(callback);
    }
  } catch {
    // not in Electron
  }
};
