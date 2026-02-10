// ============================================================================
// STOCK DTOs
// ============================================================================

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
