/**
 * Shared print assembly sheet utility.
 * Generates an A4 landscape assembly sheet for a given order ID,
 * reusable from both the Production tab and Inventory/Assembly tab.
 */

import { colorNameToHex } from './utils';

/** Escape HTML special characters to prevent XSS in print windows */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function printAssemblySheet(orderId: string): Promise<void> {
  if (!window.electron) return;
  try {
    const result = await window.electron.getOrderById(orderId);
    if (!result.success || !result.data) return;
    const order = result.data;

    const dateStr = new Date().toLocaleDateString('en-GB');

    // Collect all unique elements across all products to build dynamic columns
    const allElementIds: string[] = [];
    const elementInfoMap = new Map<string, { id: string; uniqueName: string; label: string; color: string; color2: string | null; isDualColor: boolean }>();
    for (const item of order.orderItems ?? []) {
      for (const pe of item.product?.productElements ?? []) {
        const el = pe.element;
        if (!el) continue;
        if (!elementInfoMap.has(el.id)) {
          elementInfoMap.set(el.id, { id: el.id, uniqueName: el.uniqueName, label: el.label, color: el.color, color2: el.color2, isDualColor: el.isDualColor });
          allElementIds.push(el.id);
        }
      }
    }

    // Dynamic sizing based on number of columns
    const fixedCols = 3; // Serial Number, Product Image, Label
    const totalCols = fixedCols + allElementIds.length;
    let fontSize: number;
    let cellPad: string;
    let imgSize: number;
    let dotSize: number;
    if (totalCols <= 6) { fontSize = 13; cellPad = '6px 10px'; imgSize = 48; dotSize = 18; }
    else if (totalCols <= 10) { fontSize = 11; cellPad = '4px 7px'; imgSize = 40; dotSize = 16; }
    else if (totalCols <= 14) { fontSize = 9; cellPad = '3px 5px'; imgSize = 32; dotSize = 14; }
    else { fontSize = 7; cellPad = '2px 3px'; imgSize = 24; dotSize = 12; }

    // Column widths proportional
    const snColPct = Math.max(8, Math.round(100 / totalCols * 1.5));
    const imgColPct = Math.max(5, Math.round(100 / totalCols * 0.8));
    const lblColPct = Math.max(6, Math.round(100 / totalCols * 1.0));
    const elColPct = allElementIds.length > 0 ? ((100 - snColPct - imgColPct - lblColPct) / allElementIds.length).toFixed(2) : '0';

    // Build colgroup
    let colgroup = `<colgroup><col style="width:${snColPct}%;"><col style="width:${imgColPct}%;"><col style="width:${lblColPct}%;">`;
    for (let i = 0; i < allElementIds.length; i++) colgroup += `<col style="width:${elColPct}%;">`;
    colgroup += `</colgroup>`;

    // Build table header
    let tableHtml = `<table class="at">${colgroup}<thead><tr>`;
    tableHtml += `<th style="padding:${cellPad};">Serial Number</th>`;
    tableHtml += `<th style="padding:${cellPad};">Product</th>`;
    tableHtml += `<th style="padding:${cellPad};">Label</th>`;
    for (const elId of allElementIds) {
      const el = elementInfoMap.get(elId)!;
      tableHtml += `<th style="padding:${cellPad};"><span class="thn">${el.uniqueName}</span></th>`;
    }
    tableHtml += `</tr></thead>`;

    // Build table body — one row per product
    tableHtml += `<tbody>`;
    for (const item of order.orderItems ?? []) {
      const product = item.product;
      if (!product) continue;
      const elements = product.productElements ?? [];
      const productElementMap = new Map<string, number>();
      for (const pe of elements) {
        if (pe.element) productElementMap.set(pe.element.id, pe.quantityNeeded);
      }

      tableHtml += `<tr>`;
      tableHtml += `<td class="csn" style="padding:${cellPad};">${product.serialNumber}</td>`;
      tableHtml += `<td class="cimg" style="padding:${cellPad};">`;
      if (product.imageUrl) {
        tableHtml += `<img src="${product.imageUrl}" style="width:${imgSize}px;height:${imgSize}px;object-fit:contain;border-radius:4px;display:block;margin:0 auto;" />`;
      } else {
        tableHtml += `<div style="width:${imgSize}px;height:${imgSize}px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;color:#ccc;font-size:${Math.max(8, imgSize / 3)}px;border-radius:4px;margin:0 auto;">—</div>`;
      }
      tableHtml += `</td>`;
      tableHtml += `<td class="clbl" style="padding:${cellPad};">${product.label || ''}</td>`;
      for (const elId of allElementIds) {
        const qty = productElementMap.get(elId);
        if (qty !== undefined) {
          const el = elementInfoMap.get(elId)!;
          const dot1 = `<div class="cd" style="background-color:${colorNameToHex(el.color)};width:${dotSize}px;height:${dotSize}px;" title="${el.color}"></div>`;
          const dot2 = el.isDualColor && el.color2 ? `<div class="cd cdo" style="background-color:${colorNameToHex(el.color2)};width:${dotSize}px;height:${dotSize}px;" title="${el.color2}"></div>` : '';
          tableHtml += `<td class="cel" style="padding:${cellPad};"><div class="thc">${dot1}${dot2}</div><span class="qty">×${qty}</span></td>`;
        } else {
          tableHtml += `<td class="cel cna" style="padding:${cellPad};">—</td>`;
        }
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table>`;

    let printHtml = '';
    printHtml += `<h2 style="margin:0 0 4px;font-size:15px;">Assembly Sheet — Order #${escapeHtml(String(order.orderNumber))}</h2>`;
    printHtml += `<p style="margin:0 0 12px;font-size:10px;color:#666;">${escapeHtml(order.clientName || '')} · ${dateStr}${order.notes ? ` · ${escapeHtml(order.notes)}` : ''}</p>`;
    printHtml += tableHtml;

    const printWindow = window.open('', '_blank', 'width=1100,height=700');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Assembly Sheet</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; padding: 1rem; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .header { position: sticky; top: 0; z-index: 10; background: white; border-bottom: 2px solid #333; padding: 0.75rem 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .print-btn { background: #2563eb; color: white; border: none; padding: 0.6rem 1.4rem; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; }
          .print-btn:hover { background: #1d4ed8; }
          .print-btn:active { transform: scale(0.95); }
          .content { background: white; padding: 1.5rem; border-radius: 4px; }
          .at { width: 100%; border-collapse: collapse; font-size: ${fontSize}px; table-layout: fixed; }
          .at th, .at td { border: 1px solid #444; text-align: center; vertical-align: middle; word-break: break-word; overflow-wrap: break-word; }
          .at thead th { background: #e5e5e5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
          .thc { display: flex; align-items: center; justify-content: center; margin-bottom: 2px; }
          .thn { display: block; }
          .cd { border-radius: 50%; border: 2px solid #ccc; display: inline-block; }
          .cdo { margin-left: -4px; }
          .csn { font-weight: 700; text-align: left !important; white-space: nowrap; }
          .clbl { font-weight: 600; color: #7c3aed; text-transform: uppercase; white-space: nowrap; }
          .cel .qty { font-weight: 700; color: #333; }
          .cna { color: #ccc; }
          .at tbody tr:nth-child(even) { background: #f9f9f9; }
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
            <h3 style="margin:0;">Assembly Sheet Preview</h3>
            <p style="margin:0.2rem 0 0;color:#999;font-size:11px;">A4 Landscape · Click the button to print</p>
          </div>
          <button class="print-btn" onclick="window.print()">Print</button>
        </div>
        <div class="content">${printHtml}</div>
      </body></html>`);
      printWindow.document.close();
    }
  } catch (err) {
    console.error('Failed to print assembly sheet:', err);
  }
}
