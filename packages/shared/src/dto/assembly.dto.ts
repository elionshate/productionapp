// ============================================================================
// ASSEMBLY DTOs
// ============================================================================

export interface RecordAssemblyDTO {
  orderId: string;
  productId: string;
  boxesAssembled: number;
}

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
