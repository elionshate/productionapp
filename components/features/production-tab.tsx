'use client';

import { useState, useEffect, useCallback } from 'react';
import ProductionOrderCard from '../production-order-card';
import type { ProductionOrderData } from '../../types/ipc';
import { colorNameToHex } from '../../lib/utils';
import { printAssemblySheet } from '../../lib/print-assembly';
import { useI18n } from '../../lib/i18n';

export default function ProductionTab() {
  const [productionOrders, setProductionOrders] = useState<ProductionOrderData[]>([]);
  const [isLoadingProduction, setIsLoadingProduction] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    loadProductionOrders(true);
  }, []);

  async function loadProductionOrders(initial = false) {
    if (!window.electron) { setIsLoadingProduction(false); return; }
    if (initial) setIsLoadingProduction(true);
    setLoadError(null);
    try {
      const result = await window.electron.getProductionOrders();
      if (result.success) {
        setProductionOrders(result.data);
      } else {
        console.error('Production API error:', result.error);
        setLoadError(result.error || 'Unknown error loading production orders');
      }
    } catch (err) {
      console.error('Failed to load production orders:', err);
      setLoadError(String(err));
    } finally {
      if (initial) setIsLoadingProduction(false);
    }
  }

  const handleRecordProduction = useCallback(async (orderId: string, elementId: string, amount: number): Promise<number | null> => {
    if (!window.electron) return null;
    try {
      const result = await window.electron.recordProduction({ orderId, elementId, amountProduced: amount });
      if (result.success) {
        if (result.data.orderComplete) {
          setProductionOrders(prev => prev.filter(o => o.orderId !== orderId));
        }
        return result.data.remaining;
      }
      return null;
    } catch (err) {
      console.error('Failed to record production:', err);
      return null;
    }
  }, []);

  const handleApplyInventory = useCallback(async (orderId: string): Promise<void> => {
    if (!window.electron) return;
    try {
      const result = await window.electron.applyInventoryToOrder({ orderId });
      if (result.success) {
        // Reload all production orders to get updated allocations and excess
        await loadProductionOrders();
      }
    } catch (err) {
      console.error('Failed to apply inventory:', err);
    }
  }, []);

  const handlePrintAssembly = useCallback(async (orderId: string) => {
    await printAssemblySheet(orderId);
  }, []);

  function handlePrintProduction(mode: 'orders' | 'totals', orderId?: string) {
    function buildPivotTable(
      elements: { elementName: string; elementLabel?: string; color: string; remaining?: number; totalNeeded?: number }[],
      _showTotals: boolean
    ): string {
      const elementNames = [...new Set(elements.map(e => e.elementName))].sort();
      const colors = [...new Set(elements.map(e => e.color))].sort();
      const hasLabels = elements.some(e => e.elementLabel);
      if (elementNames.length === 0 || colors.length === 0) return '';

      const lookup = new Map<string, { remaining: number; totalNeeded: number; label: string }>();
      for (const el of elements) {
        const lbl = el.elementLabel || '';
        const key = `${el.elementName}|${el.color}|${lbl}`;
        const existing = lookup.get(key);
        if (existing) {
          existing.remaining += el.remaining ?? 0;
          existing.totalNeeded += el.totalNeeded ?? 0;
        } else {
          lookup.set(key, { remaining: el.remaining ?? 0, totalNeeded: el.totalNeeded ?? 0, label: lbl });
        }
      }

      const rowKeys: { color: string; label: string }[] = [];
      const rowKeySet = new Set<string>();
      for (const el of elements) {
        const lbl = el.elementLabel || '';
        const rk = `${el.color}|${lbl}`;
        if (!rowKeySet.has(rk)) {
          rowKeySet.add(rk);
          rowKeys.push({ color: el.color, label: lbl });
        }
      }
      rowKeys.sort((a, b) => a.color.localeCompare(b.color) || a.label.localeCompare(b.label));

      const extraCols = hasLabels ? 2 : 1;
      const colCount = elementNames.length + extraCols;
      const maxNameLen = Math.max(...elementNames.map(n => n.length), ...colors.map(c => c.length));
      let fontSize: number;
      let cellPad: string;
      if (colCount <= 5) { fontSize = 13; cellPad = '6px 10px'; }
      else if (colCount <= 8) { fontSize = 11; cellPad = '4px 7px'; }
      else if (colCount <= 12) { fontSize = 9; cellPad = '3px 5px'; }
      else { fontSize = 7; cellPad = '2px 3px'; }
      if (maxNameLen > 18 && fontSize > 9) fontSize = Math.max(fontSize - 2, 7);

      const colorColPct = Math.min(20, Math.max(10, Math.round(100 / colCount * 1.2)));
      const labelColPct = hasLabels ? Math.min(18, Math.max(8, Math.round(100 / colCount * 1.1))) : 0;
      const datColPct = ((100 - colorColPct - labelColPct) / elementNames.length).toFixed(2);

      let html = `<table style="width:100%;border-collapse:collapse;font-size:${fontSize}px;margin-bottom:1rem;table-layout:fixed;">`;
      html += `<colgroup><col style="width:${colorColPct}%;">`;
      if (hasLabels) html += `<col style="width:${labelColPct}%;">`;
      for (let i = 0; i < elementNames.length; i++) html += `<col style="width:${datColPct}%;">`;
      html += `</colgroup>`;

      html += `<thead><tr>`;
      html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:left;word-break:break-word;overflow-wrap:break-word;">Color</th>`;
      if (hasLabels) html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:left;word-break:break-word;overflow-wrap:break-word;">Label</th>`;
      for (const name of elementNames) html += `<th style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;font-weight:bold;text-align:center;word-break:break-word;overflow-wrap:break-word;">${name}</th>`;
      html += `</tr></thead><tbody>`;

      const colorSpans = new Map<string, number>();
      for (const row of rowKeys) colorSpans.set(row.color, (colorSpans.get(row.color) || 0) + 1);
      const colorRendered = new Set<string>();

      for (const row of rowKeys) {
        html += `<tr>`;
        if (!colorRendered.has(row.color)) {
          colorRendered.add(row.color);
          const span = colorSpans.get(row.color) || 1;
          html += `<td rowspan="${span}" style="border:1px solid #444;padding:${cellPad};font-weight:bold;text-align:left;vertical-align:top;word-break:break-word;overflow-wrap:break-word;">${row.color}</td>`;
        }
        if (hasLabels) html += `<td style="border:1px solid #444;padding:${cellPad};text-align:left;font-weight:bold;text-transform:uppercase;color:#7c3aed;word-break:break-word;overflow-wrap:break-word;">${row.label || '-'}</td>`;
        for (const name of elementNames) {
          const val = lookup.get(`${name}|${row.color}|${row.label}`);
          if (val) html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;background:#f9f9f9;">${Math.max(0, val.remaining)}</td>`;
          else html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;color:#ccc;">-</td>`;
        }
        html += `</tr>`;
      }

      html += `<tr><td style="border:1px solid #444;padding:${cellPad};font-weight:bold;text-align:left;background:#e5e5e5;">Total</td>`;
      if (hasLabels) html += `<td style="border:1px solid #444;padding:${cellPad};background:#e5e5e5;"></td>`;
      for (const name of elementNames) {
        let colTotal = 0;
        for (const row of rowKeys) { const val = lookup.get(`${name}|${row.color}|${row.label}`); if (val) colTotal += Math.max(0, val.remaining); }
        html += `<td style="border:1px solid #444;padding:${cellPad};text-align:center;font-weight:bold;background:#e5e5e5;">${colTotal}</td>`;
      }
      html += `</tr></tbody></table>`;
      return html;
    }

    let printHtml = '';
    const dateStr = new Date().toLocaleDateString('en-GB');

    if (mode === 'orders') {
      const ordersToPrint = orderId ? productionOrders.filter(o => o.orderId === orderId) : productionOrders;
      for (const order of ordersToPrint) {
        const allEls = order.elements.map(e => ({ elementName: e.elementName, elementLabel: e.elementLabel, color: e.color, remaining: e.remaining, totalNeeded: e.totalNeeded }));
        const labeledEls = allEls.filter(e => e.elementLabel);
        const unlabeledEls = allEls.filter(e => !e.elementLabel);
        printHtml += `<div class="order-block">`;
        printHtml += `<h2>Order #${order.orderNumber} — ${order.clientName}</h2>`;
        printHtml += `<p>Date: ${dateStr}${order.notes ? ` · Notes: ${order.notes}` : ''}</p>`;
        if (unlabeledEls.length > 0) printHtml += buildPivotTable(unlabeledEls, false);
        if (labeledEls.length > 0) {
          printHtml += `<h3 style="margin:0.5rem 0 0.2rem;font-size:13px;color:#7c3aed;">Labeled Elements</h3>`;
          printHtml += buildPivotTable(labeledEls, false);
        }
        printHtml += `</div>`;
      }
    } else {
      // For aggregated totals, we sum allocations across all orders
      const aggregated = new Map<string, { elementName: string; elementLabel: string; color: string; totalNeeded: number; totalAllocated: number; remaining: number }>();
      for (const order of productionOrders) {
        for (const el of order.elements) {
          const key = `${el.elementName}|${el.color}|${el.elementLabel ?? ''}`;
          const existing = aggregated.get(key);
          if (existing) { 
            existing.totalNeeded += el.totalNeeded; 
            existing.totalAllocated += el.allocated ?? 0;
            existing.remaining = Math.max(0, existing.totalNeeded - existing.totalAllocated);
          }
          else {
            const alloc = el.allocated ?? 0;
            aggregated.set(key, { 
              elementName: el.elementName, 
              elementLabel: el.elementLabel ?? '', 
              color: el.color, 
              totalNeeded: el.totalNeeded, 
              totalAllocated: alloc,
              remaining: Math.max(0, el.totalNeeded - alloc)
            });
          }
        }
      }
      const allItems = Array.from(aggregated.values());
      printHtml += `<div class="order-block">`;
      printHtml += `<h2>Total Requirements — All Orders</h2>`;
      printHtml += `<p>Date: ${dateStr} · ${productionOrders.length} order(s) in production</p>`;
      const allEls = allItems.map(i => ({ elementName: i.elementName, elementLabel: i.elementLabel, color: i.color, remaining: i.remaining, totalNeeded: i.totalNeeded }));
      const labeledEls = allEls.filter(e => e.elementLabel);
      const unlabeledEls = allEls.filter(e => !e.elementLabel);
      if (unlabeledEls.length > 0) printHtml += buildPivotTable(unlabeledEls, false);
      if (labeledEls.length > 0) {
        printHtml += `<h3 style="margin:0.5rem 0 0.2rem;font-size:13px;color:#7c3aed;">Labeled Elements</h3>`;
        printHtml += buildPivotTable(labeledEls, false);
      }
      printHtml += `</div>`;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=700');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Production Print</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; padding: 1rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid #333; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .print-btn { background: #2563eb; color: white; border: none; padding: 0.6rem 1.4rem; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
          .print-btn:hover { background: #1d4ed8; }
          .print-btn:active { transform: scale(0.95); }
          .content { background: white; padding: 1.5rem; border-radius: 4px; }
          .order-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 1.5rem; }
          .label-section { margin-top: 0.5rem; }
          .label-header { margin: 0.5rem 0 0.25rem; font-size: 12px; color: #7c3aed; font-style: italic; }
          h2 { margin: 0 0 0.2rem; font-size: 15px; }
          p { margin: 0 0 0.4rem; font-size: 10px; color: #666; }
          @media print {
            .header { display: none !important; }
            body { background: white; padding: 0; }
            .content { padding: 0; box-shadow: none; border-radius: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            thead { display: table-header-group; }
          }
        </style>
      </head><body>
        <div class="header">
          <div>
            <h3 style="margin:0;">Production Print Preview</h3>
            <p style="margin:0.2rem 0 0;color:#999;font-size:11px;">Landscape A4 · Click the button to print</p>
          </div>
          <button class="print-btn" onclick="window.print()">🖨️ Print</button>
        </div>
        <div class="content">${printHtml}</div>
      </body></html>`);
      printWindow.document.close();
    }
  }

  return (
    <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
      {/* LEFT: Production Order Cards */}
      <div className="flex-1 overflow-y-auto border-r border-zinc-200 dark:border-zinc-800 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('production.title')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t('production.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {productionOrders.length > 0 && (
              <button onClick={() => handlePrintProduction('orders')} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.print')}</button>
            )}
            <button onClick={() => loadProductionOrders()} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.refresh')}</button>
          </div>
        </div>

        {isLoadingProduction ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load production data</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 max-w-md text-center">{loadError}</p>
            <button onClick={() => loadProductionOrders(true)} className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700">Retry</button>
          </div>
        ) : productionOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('production.noOrders')}</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              {t('production.noOrdersHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {productionOrders.map(order => (
              <ProductionOrderCard
                key={order.orderId}
                order={order}
                onRecordProduction={handleRecordProduction}
                onApplyInventory={handleApplyInventory}
                onPrint={(id) => handlePrintProduction('orders', id)}
                onPrintAssembly={handlePrintAssembly}
              />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Aggregated Totals Panel */}
      <div className="w-[380px] flex-shrink-0 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('production.totalRequirements')}</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t('production.aggregated')}</p>
          </div>
          {productionOrders.length > 0 && (
            <button onClick={() => handlePrintProduction('totals')} className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">{t('common.print')}</button>
          )}
        </div>

        {isLoadingProduction ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
          </div>
        ) : productionOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('production.noData')}</p>
          </div>
        ) : <AggregatedTotals productionOrders={productionOrders} />}
      </div>
    </div>
  );
}

// ── Aggregated Totals (right panel) ─────────────────────────

function AggregatedTotals({ productionOrders }: { productionOrders: ProductionOrderData[] }) {
  const aggregated = new Map<string, { elementName: string; elementLabel: string; color: string; color2: string | null; isDualColor: boolean; totalNeeded: number; totalAllocated: number; remaining: number; totalWeightGrams: number }>();
  for (const order of productionOrders) {
    for (const el of order.elements) {
      const key = `${el.elementName}|${el.color}|${el.color2 ?? ''}|${el.elementLabel ?? ''}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.totalNeeded += el.totalNeeded;
        existing.totalAllocated += el.allocated ?? 0;
        existing.remaining = Math.max(0, existing.totalNeeded - existing.totalAllocated);
        existing.totalWeightGrams += el.totalWeightGrams;
      } else {
        const alloc = el.allocated ?? 0;
        aggregated.set(key, {
          elementName: el.elementName, elementLabel: el.elementLabel ?? '', color: el.color,
          color2: el.color2, isDualColor: el.isDualColor,
          totalNeeded: el.totalNeeded, totalAllocated: alloc,
          remaining: Math.max(0, el.totalNeeded - alloc), totalWeightGrams: el.totalWeightGrams,
        });
      }
    }
  }
  const allItems = Array.from(aggregated.values()).sort((a, b) => a.elementName.localeCompare(b.elementName) || a.color.localeCompare(b.color));

  return (
    <div className="space-y-2">
      {allItems.map((item, idx) => {
        const isDone = item.remaining <= 0;
        const progressPercent = item.totalNeeded > 0 ? Math.min(100, (item.totalAllocated / item.totalNeeded) * 100) : 0;
        return (
          <div key={idx} className={`rounded-lg border px-3 py-2.5 ${isDone ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.elementName}</span>
              <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-500 flex-shrink-0" style={{ backgroundColor: colorNameToHex(item.color) }} title={item.color} />
              {item.isDualColor && item.color2 && (
                <div className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-500 flex-shrink-0 -ml-1.5" style={{ backgroundColor: colorNameToHex(item.color2) }} title={item.color2} />
              )}
              {item.elementLabel && (
                <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-bold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">{item.elementLabel}</span>
              )}
              {isDone && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-300">
              <span>Need: <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.totalNeeded}</span></span>
              <span>Alloc: <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.totalAllocated}</span></span>
              <span>Rem: <span className={`font-bold ${isDone ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{Math.max(0, item.remaining)}</span></span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        );
      })}
      <div className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{allItems.length} element type{allItems.length !== 1 ? 's' : ''}</span>
          <span>{allItems.filter(i => i.remaining <= 0).length} done</span>
        </div>
      </div>
    </div>
  );
}
