'use client';

import { useState } from 'react';
import type { OrderResponse } from '../types/ipc';

interface OrderCardProps {
  order: OrderResponse;
  onShip?: (id: string) => void;
  onStartProduction?: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onClick?: (id: string) => void;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  in_production: {
    label: 'In Production',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  shipped: {
    label: 'Shipped',
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-400',
    dot: 'bg-green-500',
  },
};

export default function OrderCard({ order, onShip, onStartProduction, onDelete, onClick }: OrderCardProps) {
  const [confirmShip, setConfirmShip] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [isStartingProduction, setIsStartingProduction] = useState(false);

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const itemCount = order.orderItems?.length ?? 0;
  const totalBoxes = order.orderItems?.reduce((sum, item) => sum + item.boxesNeeded, 0) ?? 0;

  async function handleShip() {
    if (!confirmShip) {
      setConfirmShip(true);
      setTimeout(() => setConfirmShip(false), 3000);
      return;
    }
    setIsShipping(true);
    onShip?.(order.id);
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete?.(order.id);
    } catch {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="group relative rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 cursor-pointer"
      onClick={() => onClick?.(order.id)}
    >
      {/* Top Row: Order # + Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Order #{order.orderNumber}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {order.clientName}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          {statusCfg.label}
        </span>
      </div>

      {/* Info Row */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(order.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          {itemCount} product{itemCount !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
          </svg>
          {totalBoxes} box{totalBoxes !== 1 ? 'es' : ''}
        </span>
      </div>

      {/* Product thumbnails */}
      {order.orderItems && order.orderItems.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto">
          {order.orderItems.slice(0, 4).map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1 dark:bg-zinc-800">
              <div className="h-8 w-11 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-700">
                {item.product?.imageUrl ? (
                  <img src={item.product.imageUrl} alt={item.product?.serialNumber} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400 text-xs">—</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{item.product?.serialNumber}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{item.boxesNeeded} box{item.boxesNeeded !== 1 ? 'es' : ''}</p>
              </div>
            </div>
          ))}
          {order.orderItems.length > 4 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
              +{order.orderItems.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mb-3 italic">
          &quot;{order.notes}&quot;
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Start Production Button — only for pending orders with items */}
        {order.status === 'pending' && onStartProduction && itemCount > 0 && (
          <button
            onClick={() => {
              if (!confirmProduction) {
                setConfirmProduction(true);
                setTimeout(() => setConfirmProduction(false), 3000);
                return;
              }
              setIsStartingProduction(true);
              onStartProduction(order.id);
            }}
            disabled={isStartingProduction}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              confirmProduction
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isStartingProduction ? 'Starting...' : confirmProduction ? 'Confirm?' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Produce
              </>
            )}
          </button>
        )}

        {/* Ship Button — only for pending / in_production */}
        {order.status !== 'shipped' && onShip && (
          <button
            onClick={handleShip}
            disabled={isShipping}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              confirmShip
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isShipping ? 'Shipping...' : confirmShip ? 'Confirm Ship?' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Ship
              </>
            )}
          </button>
        )}

        {/* Shipped indicator */}
        {order.status === 'shipped' && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Shipped{order.shippedAt ? ` ${formatDate(order.shippedAt)}` : ''}
          </span>
        )}

        <div className="flex-1" />

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 opacity-0 group-hover:opacity-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isDeleting ? 'Deleting...' : confirmDelete ? 'Confirm?' : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
