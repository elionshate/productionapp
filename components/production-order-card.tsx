'use client';

import { useState } from 'react';
import type { ProductionOrderData, ProductionElementGroup } from '../types/ipc';
import { colorNameToHex } from '../lib/utils';

interface ProductionOrderCardProps {
  order: ProductionOrderData;
  onRecordProduction: (orderId: string, elementId: string, colorId: string, amount: number) => Promise<number | null>;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams.toFixed(1)} g`;
}

export default function ProductionOrderCard({ order, onRecordProduction }: ProductionOrderCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Order Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Order #{order.orderNumber}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {order.clientName} · {formatDate(order.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          In Production
        </span>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="border-b border-zinc-100 px-5 py-2 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 italic">&quot;{order.notes}&quot;</p>
        </div>
      )}

      {/* Elements List */}
      <div className="px-5 py-3">
        {order.elements.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-4">
            No elements required for this order.
          </p>
        ) : (
          <div className="space-y-2">
            {order.elements.map(element => (
              <ProductionElementRow
                key={`${element.elementId}-${element.colorId}`}
                element={element}
                orderId={order.orderId}
                onRecordProduction={onRecordProduction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-zinc-100 px-5 py-2.5 dark:border-zinc-800">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{order.elements.length} element type{order.elements.length !== 1 ? 's' : ''}</span>
          <span>
            Total weight: {formatWeight(order.elements.reduce((sum, e) => sum + e.totalWeightGrams, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Element Row (inside order card)
// ──────────────────────────────────────────────────────────────

interface ProductionElementRowProps {
  element: ProductionElementGroup;
  orderId: string;
  onRecordProduction: (orderId: string, elementId: string, colorId: string, amount: number) => Promise<number | null>;
}

function ProductionElementRow({ element, orderId, onRecordProduction }: ProductionElementRowProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(element.remaining);
  const [totalProduced, setTotalProduced] = useState(element.totalProduced);
  const [error, setError] = useState('');

  const progressPercent = element.totalNeeded > 0
    ? Math.min(100, (totalProduced / element.totalNeeded) * 100)
    : 0;

  const isDone = remaining <= 0;

  async function handleSubmit() {
    const amount = parseInt(inputValue, 10);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amount > remaining) {
      setError(`Max remaining: ${remaining}`);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const newRemaining = await onRecordProduction(orderId, element.elementId, element.colorId, amount);
      if (newRemaining !== null) {
        setRemaining(newRemaining);
        setTotalProduced(element.totalNeeded - newRemaining);
        setInputValue('');
      } else {
        setError('Failed to record');
      }
    } catch {
      setError('Failed to record');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Remaining weight = remaining units * weight per unit
  const remainingWeight = remaining * element.weightPerUnit;

  return (
    <div className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors ${
      isDone
        ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
        : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'
    }`}>
      {/* Element Image */}
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-700">
        {element.imageUrl ? (
          <img src={element.imageUrl} alt={element.elementName} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </div>

      {/* Element Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {element.elementName}
          </span>
          {/* Color circle */}
          <div
            className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-500 flex-shrink-0"
            style={{ backgroundColor: colorNameToHex(element.colorName) }}
            title={element.colorName}
          />
        </div>
        <div className="flex items-center gap-4 mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <span>Need: <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{element.totalNeeded}</span></span>
          <span>Remaining: <span className={`font-bold text-lg ${isDone ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{remaining}</span></span>
          <span>Weight: <span className="font-semibold">{formatWeight(remainingWeight)}</span></span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Production Input */}
      <div className="flex-shrink-0">
        {isDone ? (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Done
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Qty"
                min="1"
                max={remaining}
                className="w-20 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isSubmitting}
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !inputValue}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '...' : '+'}
              </button>
            </div>
            {error && <span className="text-[10px] text-red-500">{error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
