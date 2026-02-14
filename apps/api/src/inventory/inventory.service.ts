import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const inventory = await this.prisma.inventory.findMany({
      include: { element: true },
      orderBy: [{ element: { uniqueName: 'asc' } }],
    });
    return serialize(inventory);
  }

  async findByElement(elementId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { elementId },
      include: { element: true },
    });
    return serialize(inventory);
  }

  async adjust(data: { elementId: string; changeAmount: number; reason: string }) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: {
          elementId: data.elementId,
          changeAmount: data.changeAmount,
          reason: data.reason,
        },
      });

      const inventory = await tx.inventory.upsert({
        where: { elementId: data.elementId },
        create: {
          elementId: data.elementId,
          totalAmount: data.changeAmount,
        },
        update: {
          totalAmount: { increment: data.changeAmount },
        },
        include: { element: true },
      });

      if (inventory.totalAmount < 0) {
        throw new BadRequestException('Adjustment would result in negative inventory');
      }

      // Reconcile allocations when inventory is REDUCED.
      // If total allocated for this element now exceeds the new inventory level,
      // trim allocations from the NEWEST orders first (highest orderNumber),
      // so the oldest (highest priority) orders keep their allocations longest.
      if (data.changeAmount < 0) {
        const allocations = await tx.inventoryAllocation.findMany({
          where: { elementId: data.elementId },
          include: { order: { select: { orderNumber: true } } },
          orderBy: { order: { orderNumber: 'desc' } }, // Newest orders trimmed first
        });

        const totalAllocated = allocations.reduce((sum, a) => sum + a.amountAllocated, 0);
        const newTotal = inventory.totalAmount;

        if (totalAllocated > newTotal) {
          let excess = totalAllocated - newTotal;

          for (const alloc of allocations) {
            if (excess <= 0) break;

            if (alloc.amountAllocated <= excess) {
              // This entire allocation must be removed
              excess -= alloc.amountAllocated;
              await tx.inventoryAllocation.delete({
                where: { id: alloc.id },
              });
            } else {
              // Partially reduce this allocation
              await tx.inventoryAllocation.update({
                where: { id: alloc.id },
                data: { amountAllocated: alloc.amountAllocated - excess },
              });
              excess = 0;
            }
          }
        }
      }

      return inventory;
    });

    return serialize(result);
  }

  /**
   * Delete inventory record - BUG FIX: previously crashed the app because
   * it didn't handle the case where inventory transactions referenced the
   * element via a nullable FK, and the Prisma error was unhandled.
   * Fix: wrap in transaction, delete transactions first, then inventory.
   * Also handle "not found" gracefully instead of crashing.
   */
  async delete(id: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findUnique({ where: { id } });
      if (!inv) {
        throw new NotFoundException('Inventory record not found');
      }

      // Delete related inventory allocations for this element
      await tx.inventoryAllocation.deleteMany({ where: { elementId: inv.elementId } });

      // Delete related inventory transactions for this element
      await tx.inventoryTransaction.deleteMany({ where: { elementId: inv.elementId } });

      // Now safe to delete inventory record
      await tx.inventory.delete({ where: { id } });

      return { id };
    });

    return result;
  }

  async getTransactions(skip = 0, take = 100) {
    const transactions = await this.prisma.inventoryTransaction.findMany({
      include: { element: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return serialize(transactions);
  }
}
