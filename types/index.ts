/**
 * Global Type Definitions
 * 
 * Place shared TypeScript types and interfaces here.
 * Note: ElectronAPI types are defined in types/ipc.ts (window.electron).
 * Native Electron preload API (window.electronAPI) is typed inline in preload/index.ts.
 */

// Common entity types
export type ID = string; // CUID/UUID

export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
