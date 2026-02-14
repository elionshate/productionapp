import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';
import { deductElementInventory, deductBoxMaterial } from '../common/inventory.helper';

@Injectable()
export class AssemblyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'in_production' },
      include: { orderItems: { include: { product: { include: { productElements: { include: { element: true } } } } } } },
      orderBy: { createdAt: 'asc' },
    });

    // Build inventory map once for maxAssemblable calculation
    const inventoryRecords = await this.prisma.inventory.findMany();
    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRecords) {
      inventoryMap.set(inv.elementId, inv.totalAmount);
    }

    const result = orders
      .map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        createdAt: order.createdAt,
        notes: order.notes,
        products: order.orderItems.map((item) => {
          // Calculate max assemblable boxes from current inventory
          let maxAssemblable = 0;
          const product = item.product;
          if (product && product.productElements && product.productElements.length > 0) {
            let maxBoxes = Infinity;
            for (const pe of product.productElements) {
              const available = inventoryMap.get(pe.elementId) ?? 0;
              const rawQtyPerUnit = pe.quantityNeeded;
              const qtyPerUnit = pe.element?.isDualColor ? Math.ceil(rawQtyPerUnit / 2) : rawQtyPerUnit;
              const qtyPerBox = qtyPerUnit * product.unitsPerBox;
              if (qtyPerBox <= 0) continue;
              const possibleBoxes = Math.floor(available / qtyPerBox);
              maxBoxes = Math.min(maxBoxes, possibleBoxes);
            }
            maxAssemblable = maxBoxes === Infinity ? 0 : maxBoxes;
          }

          return {
            orderItemId: item.id,
            productId: item.productId,
            serialNumber: product?.serialNumber ?? 'Unknown',
            imageUrl: product?.imageUrl ?? null,
            category: product?.category ?? '',
            boxesNeeded: item.boxesNeeded,
            boxesAssembled: item.boxesAssembled,
            remaining: item.boxesNeeded - item.boxesAssembled,
            unitsPerBox: product?.unitsPerBox ?? 1,
            maxAssemblable,
          };
        }),
      }));

    return serialize(result);
  }

  /**
   * Calculate excess assembly potential for each product across all in-production orders.
   * Compares current element inventory against what each product needs per box.
   * Returns how many extra boxes could be assembled beyond order requirements.
   */
  async getExcessAssembly() {
    // Get ALL products with their elements
    const allProducts = await this.prisma.product.findMany({
      include: { productElements: { include: { element: true } } },
    });

    // Get all inventory
    const inventoryRecords = await this.prisma.inventory.findMany();
    const inventoryMap = new Map<string, number>();
    for (const inv of inventoryRecords) {
      inventoryMap.set(inv.elementId, inv.totalAmount);
    }

    // Load all inventory allocations — these are virtually reserved for specific orders
    const allAllocations = await this.prisma.inventoryAllocation.findMany();
    const totalAllocatedPerElement = new Map<string, number>();
    for (const alloc of allAllocations) {
      const prev = totalAllocatedPerElement.get(alloc.elementId) ?? 0;
      totalAllocatedPerElement.set(alloc.elementId, prev + alloc.amountAllocated);
    }

    // Check which products have unfinished assembly in any in_production order
    const unfinishedItems = await this.prisma.orderItem.findMany({
      where: { order: { status: 'in_production' } },
      select: { productId: true, boxesNeeded: true, boxesAssembled: true },
    });
    const productHasUnfinished = new Map<string, boolean>();
    for (const item of unfinishedItems) {
      if (item.boxesAssembled < item.boxesNeeded) {
        productHasUnfinished.set(item.productId, true);
      }
    }

    // For each product, calculate how many boxes the current inventory could produce
    const results: Array<{
      productId: string;
      serialNumber: string;
      label: string;
      imageUrl: string | null;
      category: string;
      excessBoxes: number;
      locked: boolean;
    }> = [];

    for (const product of allProducts) {
      if (!product.productElements || product.productElements.length === 0) continue;

      let maxBoxes = Infinity;
      for (const pe of product.productElements) {
        // Subtract allocated amounts — only truly unallocated inventory is available for excess
        const globalAvailable = inventoryMap.get(pe.elementId) ?? 0;
        const allocated = totalAllocatedPerElement.get(pe.elementId) ?? 0;
        const available = Math.max(0, globalAvailable - allocated);
        const rawQtyPerUnit = pe.quantityNeeded;
        const qtyPerUnit = pe.element?.isDualColor ? Math.ceil(rawQtyPerUnit / 2) : rawQtyPerUnit;
        const qtyPerBox = qtyPerUnit * product.unitsPerBox;
        if (qtyPerBox <= 0) continue;
        const possibleBoxes = Math.floor(available / qtyPerBox);
        maxBoxes = Math.min(maxBoxes, possibleBoxes);
      }

      if (maxBoxes === Infinity) maxBoxes = 0;
      if (maxBoxes > 0) {
        const locked = productHasUnfinished.get(product.id) ?? false;
        results.push({
          productId: product.id,
          serialNumber: product.serialNumber,
          label: product.label,
          imageUrl: product.imageUrl,
          category: product.category,
          excessBoxes: maxBoxes,
          locked,
        });
      }
    }

    return serialize(results);
  }

  /**
   * Record excess assembly — assembles boxes directly into product_stock
   * without tying to a specific order. Deducts from inventory.
   */
  async recordExcessAssembly(data: { productId: string; boxes: number }) {
    const { productId, boxes } = data;

    if (boxes <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Check if this product still has unfinished assembly work in any order
    const unfinishedItems = await this.prisma.orderItem.findMany({
      where: {
        productId,
        order: { status: 'in_production' },
      },
    });
    const hasUnfinished = unfinishedItems.some(
      (item) => item.boxesAssembled < item.boxesNeeded,
    );
    if (hasUnfinished) {
      throw new BadRequestException(
        'Cannot record excess assembly — this product still has unfinished boxes in existing orders. Finish those first.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { productElements: { include: { element: true } } },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const totalUnits = boxes * (product.unitsPerBox ?? 1);

    // Build deduction list for shared helper
    const deductions = product.productElements.map(pe => {
      const rawQty = pe.quantityNeeded * totalUnits;
      const amount = pe.element?.isDualColor ? Math.ceil(rawQty / 2) : rawQty;
      return { elementId: pe.elementId, amount, reason: `Excess assembly: ${boxes} box(es) of ${product.serialNumber}` };
    });

    await this.prisma.$transaction(async (tx) => {
      // Add to product stock (excess stock — not tied to any order)
      await tx.productStock.upsert({
        where: { productId },
        create: { productId, stockBoxedAmount: boxes },
        update: { stockBoxedAmount: { increment: boxes } },
      });

      // Deduct element inventory (with guard) via shared helper
      await deductElementInventory(tx as any, deductions);

      // Deduct box material if applicable via shared helper
      if (product.boxRawMaterialId) {
        await deductBoxMaterial(tx as any, product.boxRawMaterialId, boxes, `Excess assembly: ${boxes} box(es) for ${product.serialNumber}`);
      }
    });

    const updatedStock = await this.prisma.productStock.findUnique({
      where: { productId },
    });

    return serialize({ productId, stockBoxedAmount: updatedStock?.stockBoxedAmount ?? boxes });
  }

  async record(data: { orderId: string; productId: string; boxesAssembled: number }) {
    const { orderId, productId, boxesAssembled } = data;

    if (boxesAssembled <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Product definition is immutable during assembly — safe to read outside transaction
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { productElements: { include: { element: true } } },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Read orderItem inside transaction to prevent TOCTOU race
      const orderItem = await tx.orderItem.findFirst({
        where: { orderId, productId },
      });
      if (!orderItem) {
        throw new BadRequestException('Order item not found');
      }

      const newTotal = orderItem.boxesAssembled + boxesAssembled;
      if (newTotal > orderItem.boxesNeeded) {
        throw new BadRequestException(
          `Cannot exceed needed boxes. Max remaining: ${orderItem.boxesNeeded - orderItem.boxesAssembled}`,
        );
      }

      const totalUnitsAssembled = boxesAssembled * (product.unitsPerBox ?? 1);

      // Build deduction list for shared helper
      const deductions = product.productElements.map(pe => {
        const rawQty = pe.quantityNeeded * totalUnitsAssembled;
        const amount = pe.element?.isDualColor ? Math.ceil(rawQty / 2) : rawQty;
        return { elementId: pe.elementId, amount, reason: `Assembly: ${boxesAssembled} box(es) of ${product.serialNumber}` };
      });

      await tx.orderItem.update({ where: { id: orderItem.id }, data: { boxesAssembled: newTotal } });

      // NOTE: Do NOT update productStock here — order-bound assembly should only
      // touch orderItem.boxesAssembled. ProductStock is exclusively for true excess
      // stock recorded via recordExcessAssembly().

      // Deduct element inventory (with guard) via shared helper
      await deductElementInventory(tx as any, deductions);

      // Deduct box material if applicable via shared helper
      if (product.boxRawMaterialId) {
        await deductBoxMaterial(tx as any, product.boxRawMaterialId, boxesAssembled, `Assembly: ${boxesAssembled} box(es) for ${product.serialNumber}`);
      }

      return { boxesAssembled: newTotal, remaining: orderItem.boxesNeeded - newTotal };
    });

    return result;
  }
}
