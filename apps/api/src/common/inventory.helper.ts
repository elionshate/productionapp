/**
 * Shared inventory deduction helpers.
 *
 * Extracted from assembly.service.ts and production.service.ts to eliminate
 * code duplication (audit L6). Both services previously had ~40 lines each
 * for element-inventory deduction + inventory-transaction logging + box-material
 * deduction + raw-material-transaction logging.
 */

import { BadRequestException } from '@nestjs/common';

/** Minimal Prisma transaction client shape we need */
type TxClient = {
  inventory: {
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  inventoryTransaction: {
    create: (args: any) => Promise<any>;
  };
  rawMaterial: {
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  rawMaterialTransaction: {
    create: (args: any) => Promise<any>;
  };
};

interface ElementDeduction {
  elementId: string;
  amount: number;
  reason: string;
}

/**
 * Deduct element inventory inside a transaction.
 * Throws BadRequestException if any element has insufficient stock.
 *
 * @param tx     - Prisma transaction client
 * @param items  - Array of { elementId, amount, reason } to deduct
 * @param guard  - If true (default), throw on insufficient stock. If false, allow negatives.
 */
export async function deductElementInventory(
  tx: TxClient,
  items: ElementDeduction[],
  guard = true,
): Promise<void> {
  for (const item of items) {
    if (guard) {
      const inv = await tx.inventory.findUnique({ where: { elementId: item.elementId }, include: { element: true } });
      const available = inv?.totalAmount ?? 0;
      if (available < item.amount) {
        const name = inv?.element?.uniqueName ?? item.elementId;
        const color = inv?.element?.color ?? 'Unknown';
        throw new BadRequestException(
          `Insufficient inventory for ${name} (${color}): need ${item.amount}, have ${available}`,
        );
      }
    }
    await tx.inventory.update({
      where: { elementId: item.elementId },
      data: { totalAmount: { decrement: item.amount } },
    });
    await tx.inventoryTransaction.create({
      data: {
        elementId: item.elementId,
        changeAmount: -item.amount,
        reason: item.reason,
      },
    });
  }
}

/**
 * Deduct box raw material inside a transaction.
 * Throws BadRequestException if insufficient stock.
 *
 * @param tx             - Prisma transaction client
 * @param rawMaterialId  - ID of the raw material to deduct
 * @param amount         - Amount to deduct (in material units)
 * @param reason         - Transaction reason string
 */
export async function deductBoxMaterial(
  tx: TxClient,
  rawMaterialId: string,
  amount: number,
  reason: string,
): Promise<void> {
  const material = await tx.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material || material.stockQty < amount) {
    throw new BadRequestException(
      `Insufficient box material "${material?.name ?? rawMaterialId}": need ${amount}, have ${material?.stockQty ?? 0}`,
    );
  }
  await tx.rawMaterial.update({
    where: { id: rawMaterialId },
    data: { stockQty: { decrement: amount } },
  });
  await tx.rawMaterialTransaction.create({
    data: {
      rawMaterialId,
      changeAmount: -amount,
      reason,
    },
  });
}
