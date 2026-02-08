'use client';

import { useState } from 'react';
import type { ProductResponse } from '../types/ipc';
import { colorNameToHex } from '../lib/utils';

interface ProductCardProps {
  product: ProductResponse;
  onDelete?: (id: string) => void;
}

export default function ProductCard({ product, onDelete }: ProductCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setIsDeleting(true);
    onDelete?.(product.id);
  }

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Delete Button (top-right, visible on hover) */}
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium shadow-sm transition-all ${
            confirmDelete
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-white/90 text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-red-950/50 dark:hover:text-red-400'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isDeleting ? (
            'Deleting...'
          ) : confirmDelete ? (
            'Confirm?'
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}

      {/* Product Image */}
      <div className="mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.serialNumber}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-zinc-400 dark:text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {product.serialNumber}
          </h3>
          <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {product.unitsPerBox}u/box
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {product.category}
        </p>
        {/* Element list with colors */}
        {product.productElements && product.productElements.length > 0 ? (
          <div className="space-y-1 pt-1">
            {product.productElements.slice(0, 6).map((pe) => (
              <div key={pe.id} className="flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded-full border-2 border-white shadow-sm dark:border-zinc-900 flex-shrink-0"
                  style={{ backgroundColor: colorNameToHex(pe.color?.colorName || '') }}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                  {pe.element?.uniqueName}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-auto flex-shrink-0">
                  {pe.color?.colorName}
                </span>
              </div>
            ))}
            {product.productElements.length > 6 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-7">
                +{product.productElements.length - 6} more
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-1">No elements</p>
        )}
      </div>
    </div>
  );
}
