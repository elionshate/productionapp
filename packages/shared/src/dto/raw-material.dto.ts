// ============================================================================
// RAW MATERIAL DTOs
// ============================================================================

export interface CreateRawMaterialDTO {
  name: string;
  unit: string;
  stockQty?: number;
}

export interface UpdateRawMaterialDTO {
  name?: string;
  unit?: string;
}

export interface AdjustRawMaterialStockDTO {
  rawMaterialId: string;
  changeAmount: number;
  reason?: string;
}

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
