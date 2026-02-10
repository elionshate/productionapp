// ============================================================================
// ELEMENT DTOs
// ============================================================================

import { RawMaterialResponse } from './raw-material.dto';

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
