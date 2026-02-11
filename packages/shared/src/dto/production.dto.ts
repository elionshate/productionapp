// ============================================================================
// PRODUCTION DTOs
// ============================================================================

export interface RecordProductionDTO {
  orderId: string;
  elementId: string;
  amountProduced: number;
}

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
  inventoryAvailable: number;
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
