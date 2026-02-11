import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';
import { generateManufacturingOrders } from '../orders/manufacturing.helper';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async getInProduction() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'in_production' },
      include: {
        orderItems: {
          include: {
            product: { include: { productElements: { include: { element: true } } } },
          },
        },
        manufacturingOrders: {
          include: { requirements: { include: { element: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch all inventory to factor into remaining calculations
    const inventoryRecords = await this.prisma.inventory.findMany();
    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRecords) {
      inventoryMap.set(inv.elementId, inv.totalAmount);
    }

    // Retroactive fix: auto-generate manufacturing orders for orders missing them
    for (const order of orders) {
      if (order.manufacturingOrders.length === 0 && order.orderItems.length > 0) {
        await this.prisma.$transaction(async (tx) => {
          await generateManufacturingOrders(tx, order.id, order.orderItems);
        });
        const refreshed = await this.prisma.manufacturingOrder.findMany({
          where: { orderId: order.id },
          include: { requirements: { include: { element: true } } },
        });
        (order as any).manufacturingOrders = refreshed;
      }
    }

    // Aggregate elements per order
    const result = orders.map((order) => {
      const elementMap = new Map<string, {
        elementId: string; elementName: string; elementLabel: string;
        color: string; color2: string | null; isDualColor: boolean;
        material: string; imageUrl: string | null; weightPerUnit: number;
        totalNeeded: number; totalProduced: number; remaining: number;
        inventoryAvailable: number; totalWeightGrams: number;
      }>();

      for (const mfgOrder of order.manufacturingOrders) {
        for (const req of mfgOrder.requirements) {
          const inventoryAvailable = inventoryMap.get(req.elementId) ?? 0;
          const existing = elementMap.get(req.elementId);
          if (existing) {
            existing.totalNeeded += req.quantityNeeded;
            existing.totalProduced += req.quantityProduced;
            // Remaining = what still needs to be produced (factoring in available inventory)
            existing.remaining = Math.max(0, existing.totalNeeded - inventoryAvailable);
            existing.totalWeightGrams += Number(req.totalWeightGrams);
          } else {
            const totalNeeded = req.quantityNeeded;
            elementMap.set(req.elementId, {
              elementId: req.elementId,
              elementName: req.element?.uniqueName ?? 'Unknown',
              elementLabel: req.element?.label ?? '',
              color: req.element?.color ?? 'Unknown',
              color2: req.element?.color2 ?? null,
              isDualColor: req.element?.isDualColor ?? false,
              material: req.element?.material ?? '',
              imageUrl: req.element?.imageUrl ?? null,
              weightPerUnit: Number(req.element?.weightGrams ?? 0),
              totalNeeded: totalNeeded,
              totalProduced: req.quantityProduced,
              // Remaining = what still needs to be produced (factoring in available inventory)
              remaining: Math.max(0, totalNeeded - inventoryAvailable),
              inventoryAvailable: inventoryAvailable,
              totalWeightGrams: Number(req.totalWeightGrams),
            });
          }
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        createdAt: order.createdAt,
        notes: order.notes,
        elements: Array.from(elementMap.values()),
      };
    });

    return serialize(result);
  }

  async recordProduction(data: { orderId: string; elementId: string; amountProduced: number }) {
    const { orderId, elementId, amountProduced } = data;

    if (amountProduced <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const requirements = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrder: { orderId }, elementId },
    });

    if (requirements.length === 0) {
      throw new BadRequestException('No material requirements found for this element in this order');
    }

    // Distribute produced amount across requirements
    let remainingToDistribute = amountProduced;
    for (const req of requirements) {
      const canProduce = req.quantityNeeded - req.quantityProduced;
      if (canProduce <= 0) continue;
      const toApply = Math.min(remainingToDistribute, canProduce);
      await this.prisma.materialRequirement.update({
        where: { id: req.id },
        data: { quantityProduced: { increment: toApply } },
      });
      remainingToDistribute -= toApply;
      if (remainingToDistribute <= 0) break;
    }

    // Add to inventory + deduct raw materials
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: { elementId, changeAmount: amountProduced, reason: 'Production for Order' },
      });
      await tx.inventory.upsert({
        where: { elementId },
        create: { elementId, totalAmount: amountProduced },
        update: { totalAmount: { increment: amountProduced } },
      });

      const element = await tx.element.findUnique({
        where: { id: elementId },
        include: { rawMaterial: true },
      });
      if (element?.rawMaterialId && element.rawMaterial) {
        const weightG = Number(element.weightGrams);
        const totalGrams = amountProduced * weightG;
        // Convert grams to the raw material's storage unit
        const unit = element.rawMaterial.unit;
        const deductAmount = unit === 'kg' ? totalGrams / 1000 : totalGrams;
        await tx.rawMaterial.update({
          where: { id: element.rawMaterialId },
          data: { stockQty: { decrement: deductAmount } },
        });
        const displayAmount = unit === 'kg'
          ? `${(totalGrams / 1000).toFixed(3)}kg`
          : `${totalGrams}g`;
        await tx.rawMaterialTransaction.create({
          data: {
            rawMaterialId: element.rawMaterialId,
            changeAmount: -deductAmount,
            reason: `Production: ${amountProduced} × ${element.uniqueName} (${weightG}g each = ${displayAmount})`,
          },
        });
      }
    });

    const updatedReqs = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrder: { orderId }, elementId },
    });
    const totalNeeded = updatedReqs.reduce((sum, r) => sum + r.quantityNeeded, 0);
    
    // Get current inventory for this element to calculate real remaining
    const inventory = await this.prisma.inventory.findUnique({
      where: { elementId },
    });
    const inventoryAvailable = inventory?.totalAmount ?? 0;
    const remaining = Math.max(0, totalNeeded - inventoryAvailable);

    const allReqs = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrder: { orderId } },
    });
    
    // Check if all elements for this order have enough inventory
    const orderComplete = await this.checkOrderComplete(orderId);

    return { remaining, orderComplete };
  }

  /**
   * Check if an order is complete by verifying all elements have sufficient inventory
   */
  private async checkOrderComplete(orderId: string): Promise<boolean> {
    const allReqs = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrder: { orderId } },
    });

    // Group requirements by element
    const elementNeeds = new Map<string, number>();
    for (const req of allReqs) {
      const current = elementNeeds.get(req.elementId) ?? 0;
      elementNeeds.set(req.elementId, current + req.quantityNeeded);
    }

    // Check inventory for each element
    for (const [elementId, needed] of elementNeeds) {
      const inventory = await this.prisma.inventory.findUnique({
        where: { elementId },
      });
      const available = inventory?.totalAmount ?? 0;
      if (available < needed) {
        return false;
      }
    }

    return true;
  }
}
