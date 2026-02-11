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

    // Fetch all inventory (global pool — physical count, never changed by allocation)
    const inventoryRecords = await this.prisma.inventory.findMany();
    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRecords) {
      inventoryMap.set(inv.elementId, inv.totalAmount);
    }

    // Fetch all allocations (manual inventory assignments per order)
    const allocations = await this.prisma.inventoryAllocation.findMany();
    // Map: orderId -> elementId -> amountAllocated
    const allocationMap = new Map<string, Map<string, number>>();
    // Also track total allocations per element across ALL orders (for excess calculation)
    const totalAllocatedPerElement = new Map<string, number>();
    for (const alloc of allocations) {
      if (!allocationMap.has(alloc.orderId)) {
        allocationMap.set(alloc.orderId, new Map());
      }
      allocationMap.get(alloc.orderId)!.set(alloc.elementId, alloc.amountAllocated);
      const prev = totalAllocatedPerElement.get(alloc.elementId) ?? 0;
      totalAllocatedPerElement.set(alloc.elementId, prev + alloc.amountAllocated);
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
    // MANUAL allocation: remaining = totalNeeded - allocated (NOT auto-deducted from global inventory)
    const result = orders.map((order) => {
      const orderAllocations = allocationMap.get(order.id) ?? new Map<string, number>();

      const elementMap = new Map<string, {
        elementId: string; elementName: string; elementLabel: string;
        color: string; color2: string | null; isDualColor: boolean;
        material: string; imageUrl: string | null; weightPerUnit: number;
        totalNeeded: number; totalProduced: number; remaining: number;
        allocated: number; excessAvailable: number; totalWeightGrams: number;
      }>();

      for (const mfgOrder of order.manufacturingOrders) {
        for (const req of mfgOrder.requirements) {
          const allocated = orderAllocations.get(req.elementId) ?? 0;
          // Excess = global inventory - total allocated across ALL orders (what's truly unassigned)
          const globalInv = inventoryMap.get(req.elementId) ?? 0;
          const totalAllocated = totalAllocatedPerElement.get(req.elementId) ?? 0;
          const excessAvailable = Math.max(0, globalInv - totalAllocated);
          const existing = elementMap.get(req.elementId);
          if (existing) {
            existing.totalNeeded += req.quantityNeeded;
            existing.totalProduced += req.quantityProduced;
            // Remaining = totalNeeded - what was manually allocated
            existing.remaining = Math.max(0, existing.totalNeeded - allocated);
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
              // Remaining = totalNeeded - manually allocated amount
              remaining: Math.max(0, totalNeeded - allocated),
              allocated: allocated,
              excessAvailable: excessAvailable,
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

  /**
   * Manually apply available inventory to an order's production requirements.
   * This is VIRTUAL — it does NOT deduct from Inventory.totalAmount.
   * It only creates InventoryAllocation records so the production tab shows correct remaining.
   * Available = globalInventory - sum(all allocations for that element across ALL orders).
   */
  async applyInventoryToOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        manufacturingOrders: {
          include: { requirements: { include: { element: true } } },
        },
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }
    if (order.status !== 'in_production') {
      throw new BadRequestException('Order must be in production');
    }

    // Aggregate element needs for this order
    const elementNeeds = new Map<string, number>();
    for (const mfgOrder of order.manufacturingOrders) {
      for (const req of mfgOrder.requirements) {
        const current = elementNeeds.get(req.elementId) ?? 0;
        elementNeeds.set(req.elementId, current + req.quantityNeeded);
      }
    }

    const applied: Array<{ elementId: string; amountApplied: number }> = [];

    await this.prisma.$transaction(async (tx) => {
      // Get ALL existing allocations across ALL orders (to calculate what's truly unallocated)
      const allAllocations = await tx.inventoryAllocation.findMany();
      const totalAllocatedPerElement = new Map<string, number>();
      for (const alloc of allAllocations) {
        const prev = totalAllocatedPerElement.get(alloc.elementId) ?? 0;
        totalAllocatedPerElement.set(alloc.elementId, prev + alloc.amountAllocated);
      }

      for (const [elementId, totalNeeded] of elementNeeds) {
        // Get current global inventory (UNCHANGED by allocation — represents physical stock)
        const inventory = await tx.inventory.findUnique({ where: { elementId } });
        const globalInventory = inventory?.totalAmount ?? 0;

        // Calculate truly unallocated excess: global - sum of all allocations
        const totalAllocated = totalAllocatedPerElement.get(elementId) ?? 0;
        const unallocatedExcess = Math.max(0, globalInventory - totalAllocated);
        if (unallocatedExcess <= 0) continue;

        // Get existing allocation for THIS order+element
        const existingAllocation = await tx.inventoryAllocation.findUnique({
          where: { orderId_elementId: { orderId, elementId } },
        });
        const alreadyAllocated = existingAllocation?.amountAllocated ?? 0;

        // How much more does this order still need?
        const stillNeeded = Math.max(0, totalNeeded - alreadyAllocated);
        if (stillNeeded <= 0) continue;

        // Apply: min of (unallocated excess, what's still needed)
        const toAllocate = Math.min(unallocatedExcess, stillNeeded);
        if (toAllocate <= 0) continue;

        // Upsert allocation record — NO inventory deduction, purely virtual tracking
        await tx.inventoryAllocation.upsert({
          where: { orderId_elementId: { orderId, elementId } },
          create: { orderId, elementId, amountAllocated: toAllocate },
          update: { amountAllocated: { increment: toAllocate } },
        });

        // Update the running total so subsequent elements in this loop see the new allocation
        totalAllocatedPerElement.set(elementId, totalAllocated + toAllocate);

        applied.push({ elementId, amountApplied: toAllocate });
      }
    });

    // Check if order is now complete (all elements fully allocated)
    const orderComplete = await this.checkOrderComplete(orderId);

    return serialize({ orderId, applied, orderComplete });
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

    // After recording production, return remaining based on allocation (NOT auto-deducted)
    const updatedReqs = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrder: { orderId }, elementId },
    });
    const totalNeeded = updatedReqs.reduce((sum, r) => sum + r.quantityNeeded, 0);
    
    // Get allocation for this order+element
    const allocation = await this.prisma.inventoryAllocation.findUnique({
      where: { orderId_elementId: { orderId, elementId } },
    });
    const allocated = allocation?.amountAllocated ?? 0;
    const remaining = Math.max(0, totalNeeded - allocated);

    // Check if all elements for this order are fully allocated
    const orderComplete = await this.checkOrderComplete(orderId);

    return { remaining, orderComplete };
  }

  /**
   * Check if an order is complete by verifying all elements are fully allocated
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

    // Check allocations for each element
    for (const [elementId, needed] of elementNeeds) {
      const allocation = await this.prisma.inventoryAllocation.findUnique({
        where: { orderId_elementId: { orderId, elementId } },
      });
      const allocated = allocation?.amountAllocated ?? 0;
      if (allocated < needed) {
        return false;
      }
    }

    return true;
  }
}
