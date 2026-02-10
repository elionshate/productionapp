// ============================================================================
// ORDER DTOs
// ============================================================================

export interface CreateOrderDTO {
  clientName: string;
  status?: 'pending' | 'in_production';
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
  boxesAssembled?: number;
  createdAt: Date;
  product?: ProductResponseBase;
}

// Minimal product reference to avoid circular deps
export interface ProductResponseBase {
  id: string;
  serialNumber: string;
  category: string;
  label: string;
  unitsPerAssembly: number;
  unitsPerBox: number;
  boxRawMaterialId: string | null;
  imageUrl: string | null;
  createdAt: Date;
}

// Forward-declare manufacturing order response
export interface ManufacturingOrderResponse {
  id: string;
  orderId: string;
  productId: string;
  quantityToMake: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requirements?: MaterialRequirementResponse[];
  product?: ProductResponseBase;
}

export interface MaterialRequirementResponse {
  id: string;
  manufacturingOrderId: string;
  elementId: string;
  quantityNeeded: number;
  quantityProduced: number;
  totalWeightGrams: number;
  element?: ElementResponseBase;
}

// Minimal element reference
export interface ElementResponseBase {
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
}
