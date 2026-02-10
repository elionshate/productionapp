import { Injectable, NotFoundException } from '@nestjs/common';
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

      // Delete related inventory transactions for this element
      await tx.inventoryTransaction.deleteMany({ where: { elementId: inv.elementId } });

      // Now safe to delete inventory record
      await tx.inventory.delete({ where: { id } });

      return { id };
    });

    return result;
  }

  async getTransactions() {
    const transactions = await this.prisma.inventoryTransaction.findMany({
      include: { element: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return serialize(transactions);
  }
}
