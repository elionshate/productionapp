// ============================================================================
// PRODUCT DTOs
// ============================================================================

import { ElementResponseBase } from './order.dto';

export interface RawMaterialResponseRef {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  createdAt: Date;
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
  productStock?: ProductStockResponse | null;
  boxRawMaterial?: RawMaterialResponseRef | null;
}

export interface ProductElementResponse {
  id: string;
  productId: string;
  elementId: string;
  quantityNeeded: number;
  element?: ElementResponseBase;
}

export interface ProductStockResponse {
  id: string;
  productId: string;
  stockBoxedAmount: number;
  updatedAt: Date;
  product?: ProductResponse;
}

