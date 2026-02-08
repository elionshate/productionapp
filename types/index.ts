/**
 * Global Type Definitions
 * 
 * Place shared TypeScript types and interfaces here.
 */

// Electron API types (for window.electronAPI)
export interface ElectronAPI {
  ping: () => Promise<string>;
  // db: {
  //   query: (sql: string, params: any[]) => Promise<any>;
  //   create: (model: string, data: any) => Promise<any>;
  //   update: (model: string, id: string, data: any) => Promise<any>;
  //   delete: (model: string, id: string) => Promise<any>;
  // };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

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
