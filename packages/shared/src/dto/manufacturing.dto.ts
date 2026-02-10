// ============================================================================
// MANUFACTURING DTOs
// ============================================================================

export interface CreateManufacturingOrderDTO {
  orderId: string;
  productId: string;
  quantityToMake: number;
}

export interface UpdateManufacturingOrderDTO {
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}
