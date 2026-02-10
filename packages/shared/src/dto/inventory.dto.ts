// ============================================================================
// INVENTORY DTOs
// ============================================================================

import { ElementResponse } from './element.dto';

export interface CreateInventoryTransactionDTO {
  elementId: string;
  changeAmount: number;
  reason: string;
}

export interface InventoryResponse {
  id: string;
  elementId: string;
  totalAmount: number;
  updatedAt: Date;
  element?: ElementResponse;
}

export interface InventoryTransactionResponse {
  id: string;
  elementId: string | null;
  changeAmount: number;
  reason: string;
  createdAt: Date;
  element?: ElementResponse;
}
