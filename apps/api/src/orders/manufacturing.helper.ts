import { PrismaClient } from '@prisma/client';

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Generate manufacturing orders + material requirements for an order.
 * Reusable across create and update flows.
 */
export async function generateManufacturingOrders(
  tx: TransactionClient,
  orderId: string,
  orderItems: Array<{
    productId: string;
    boxesNeeded: number;
    product?: {
      unitsPerBox?: number;
      productElements?: Array<{
        elementId: string;
        quantityNeeded: number;
        element?: {
          isDualColor?: boolean;
          weightGrams?: unknown;
        } | null;
      }>;
    } | null;
  }>,
): Promise<void> {
  for (const item of orderItems) {
    const existing = await tx.manufacturingOrder.findFirst({
      where: { orderId, productId: item.productId },
    });
    if (existing) continue;

    const totalUnits = item.boxesNeeded * (item.product?.unitsPerBox ?? 1);

    const mfgOrder = await tx.manufacturingOrder.create({
      data: {
        orderId,
        productId: item.productId,
        quantityToMake: totalUnits,
        status: 'in_progress',
      },
    });

    if (item.product?.productElements) {
      for (const pe of item.product.productElements) {
        const rawQty = pe.quantityNeeded * totalUnits;
        const quantityNeeded = pe.element?.isDualColor ? Math.ceil(rawQty / 2) : rawQty;
        const totalWeightGrams = Number(pe.element?.weightGrams ?? 0) * quantityNeeded;

        await tx.materialRequirement.upsert({
          where: {
            manufacturingOrderId_elementId: {
              manufacturingOrderId: mfgOrder.id,
              elementId: pe.elementId,
            },
          },
          create: {
            manufacturingOrderId: mfgOrder.id,
            elementId: pe.elementId,
            quantityNeeded,
            totalWeightGrams,
          },
          update: {
            quantityNeeded,
            totalWeightGrams,
          },
        });
      }
    }
  }
}
