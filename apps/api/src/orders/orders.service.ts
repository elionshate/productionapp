import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';
import { generateManufacturingOrders } from './manufacturing.helper';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    orderItems: { include: { product: true } },
    manufacturingOrders: { include: { requirements: { include: { element: true } } } },
  };

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
    return serialize(orders);
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: { include: { productElements: { include: { element: true } } } },
          },
        },
        manufacturingOrders: {
          include: { requirements: { include: { element: true } }, product: true },
        },
      },
    });
    return serialize(order);
  }

  async create(data: {
    clientName: string;
    status?: string;
    notes?: string;
    items: Array<{ productId: string; boxesNeeded: number }>;
  }) {
    const result = await this.prisma.$queryRaw<{ max_num: number | null }[]>`
      SELECT MAX(order_number) as max_num FROM orders
    `;
    const nextOrderNumber = Number(result[0]?.max_num ?? 0) + 1;
    const status = data.status ?? 'pending';

    const orderId = crypto.randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO orders (id, order_number, client_name, status, notes, created_at)
      VALUES (${orderId}, ${nextOrderNumber}, ${data.clientName}, ${status}, ${data.notes ?? null}, datetime('now'))
    `;

    for (const item of data.items) {
      const itemId = crypto.randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO order_items (id, order_id, product_id, boxes_needed, created_at)
        VALUES (${itemId}, ${orderId}, ${item.productId}, ${item.boxesNeeded}, datetime('now'))
      `;
    }

    // Check raw material availability for production orders
    if (status === 'in_production') {
      const materialCheck = await this.getRawMaterialShortages(orderId);
      if (!materialCheck.sufficient) {
        const shortageNote = '⚠️ Pending: Insufficient raw materials — ' + materialCheck.shortages
          .map(s => `${s.materialName}: need ${s.totalNeeded} ${s.unit}, have ${s.currentStock} ${s.unit}`)
          .join('; ');
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'pending', notes: shortageNote },
        });
        const pendingOrder = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: this.defaultInclude,
        });
        return serialize(pendingOrder);
      }
    }

    // Stock is no longer auto-applied — user manually applies excess stock via the Stock tab

    // Auto-generate manufacturing orders when created as in_production
    if (status === 'in_production' && data.items.length > 0) {
      const orderWithElements = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: { include: { productElements: { include: { element: true } } } },
            },
          },
        },
      });

      if (orderWithElements?.orderItems) {
        await this.prisma.$transaction(async (tx) => {
          await generateManufacturingOrders(tx, orderId, orderWithElements.orderItems);
        });
      }
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.defaultInclude,
    });
    return serialize(order);
  }

  async update(id: string, data: { status?: string; notes?: string }) {
    // Validate shipping — ensure all products are fully assembled
    if (data.status === 'shipped') {
      const items = await this.prisma.orderItem.findMany({
        where: { orderId: id },
        include: { product: true },
      });
      const notReady = items.filter(item => item.boxesAssembled < item.boxesNeeded);
      if (notReady.length > 0) {
        const details = notReady.map(i =>
          `${i.product?.serialNumber ?? 'Unknown'}: ${i.boxesAssembled}/${i.boxesNeeded} boxes assembled`
        ).join(', ');
        throw new BadRequestException(`Cannot ship — not all products fully assembled: ${details}`);
      }
    }

    // Validate production start — check raw material availability
    if (data.status === 'in_production') {
      const materialCheck = await this.getRawMaterialShortages(id);
      if (!materialCheck.sufficient) {
        const shortageNote = '⚠️ Pending: Insufficient raw materials — ' + materialCheck.shortages
          .map(s => `${s.materialName}: need ${s.totalNeeded} ${s.unit}, have ${s.currentStock} ${s.unit}`)
          .join('; ');
        await this.prisma.order.update({
          where: { id },
          data: { notes: shortageNote },
        });
        throw new BadRequestException(shortageNote);
      }
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.status === 'in_production' ? (data.notes ?? null) : data.notes,
        ...(data.status === 'shipped' ? { shippedAt: new Date() } : {}),
      },
      include: {
        orderItems: {
          include: {
            product: { include: { productElements: { include: { element: true } } } },
          },
        },
      },
    });

    if (data.status === 'in_production' && order.orderItems) {
      // Stock is no longer auto-applied — user manually applies excess stock via the Stock tab
      // Generate manufacturing orders for the newly-in-production order
      const refreshedOrder = await this.prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              product: { include: { productElements: { include: { element: true } } } },
            },
          },
        },
      });
      if (refreshedOrder?.orderItems) {
        await this.prisma.$transaction(async (tx) => {
          await generateManufacturingOrders(tx, id, refreshedOrder.orderItems);
        });
      }
    }

    // Stock deduction is no longer needed on ship since ProductStock now
    // exclusively represents true excess stock. Manual stock-to-order application
    // already decrements ProductStock when the user applies it.

    // Re-fetch to reflect changes
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    return serialize(updatedOrder);
  }

  /**
   * Internal raw material shortage calculation.
   */
  private async getRawMaterialShortages(orderId: string): Promise<{
    shortages: Array<{ materialName: string; unit: string; totalNeeded: number; currentStock: number; shortage: number }>;
    sufficient: boolean;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                productElements: {
                  include: { element: { include: { rawMaterial: true } } },
                },
                boxRawMaterial: true,
              },
            },
          },
        },
      },
    });

    if (!order) return { shortages: [], sufficient: true };

    // Aggregate total raw material needed across all order items
    const materialNeeds = new Map<string, {
      materialId: string;
      materialName: string;
      unit: string;
      totalNeeded: number;
      currentStock: number;
    }>();

    for (const item of order.orderItems) {
      if (!item.product) continue;
      // Only calculate materials for boxes still needing production
      const boxesStillNeeded = item.boxesNeeded - (item.boxesAssembled ?? 0);
      if (boxesStillNeeded <= 0) continue; // Fully fulfilled from stock
      const totalUnits = boxesStillNeeded * (item.product.unitsPerBox ?? 1);

      // Element raw materials
      for (const pe of item.product.productElements ?? []) {
        if (!pe.element?.rawMaterialId || !pe.element.rawMaterial) continue;

        const rawQty = pe.quantityNeeded * totalUnits;
        const elementQty = pe.element.isDualColor ? Math.ceil(rawQty / 2) : rawQty;
        const weightG = Number(pe.element.weightGrams);
        let materialNeeded = elementQty * weightG; // in grams

        // Convert grams to the raw material's storage unit
        const unit = pe.element.rawMaterial.unit;
        if (unit === 'kg') {
          materialNeeded = materialNeeded / 1000;
        }

        const matId = pe.element.rawMaterialId;
        const existing = materialNeeds.get(matId);
        if (existing) {
          existing.totalNeeded += materialNeeded;
        } else {
          materialNeeds.set(matId, {
            materialId: matId,
            materialName: pe.element.rawMaterial.name,
            unit,
            totalNeeded: materialNeeded,
            currentStock: pe.element.rawMaterial.stockQty,
          });
        }
      }

      // Box raw material
      if (item.product.boxRawMaterialId && item.product.boxRawMaterial) {
        const matId = item.product.boxRawMaterialId;
        const existing = materialNeeds.get(matId);
        if (existing) {
          existing.totalNeeded += boxesStillNeeded;
        } else {
          materialNeeds.set(matId, {
            materialId: matId,
            materialName: item.product.boxRawMaterial.name,
            unit: item.product.boxRawMaterial.unit,
            totalNeeded: item.boxesNeeded,
            currentStock: item.product.boxRawMaterial.stockQty,
          });
        }
      }
    }

    const shortages: Array<{
      materialName: string;
      unit: string;
      totalNeeded: number;
      currentStock: number;
      shortage: number;
    }> = [];

    for (const [, mat] of materialNeeds) {
      if (mat.currentStock < mat.totalNeeded) {
        shortages.push({
          materialName: mat.materialName,
          unit: mat.unit,
          totalNeeded: Math.round(mat.totalNeeded * 100) / 100,
          currentStock: Math.round(mat.currentStock * 100) / 100,
          shortage: Math.round((mat.totalNeeded - mat.currentStock) * 100) / 100,
        });
      }
    }

    return { shortages, sufficient: shortages.length === 0 };
  }

  /**
   * Check raw material availability for an order (public API endpoint).
   */
  async checkMaterialAvailability(orderId: string) {
    const result = await this.getRawMaterialShortages(orderId);
    return serialize(result);
  }

  async addOrderItem(orderId: string, data: { productId: string; boxesNeeded: number }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'shipped') throw new BadRequestException('Cannot modify a shipped order');

    // Check duplicate
    const existing = await this.prisma.orderItem.findFirst({
      where: { orderId, productId: data.productId },
    });
    if (existing) throw new BadRequestException('This product is already in the order');

    const itemId = crypto.randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO order_items (id, order_id, product_id, boxes_needed, created_at)
      VALUES (${itemId}, ${orderId}, ${data.productId}, ${data.boxesNeeded}, datetime('now'))
    `;

    // If order is already in_production, generate manufacturing orders for the new item
    if (order.status === 'in_production') {
      const newItem = await this.prisma.orderItem.findUnique({
        where: { id: itemId },
        include: {
          product: { include: { productElements: { include: { element: true } } } },
        },
      });
      if (newItem) {
        await this.prisma.$transaction(async (tx) => {
          await generateManufacturingOrders(tx, orderId, [newItem]);
        });
      }
    }

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.defaultInclude,
    });
    return serialize(updatedOrder);
  }

  async removeOrderItem(orderItemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item) throw new BadRequestException('Order item not found');
    if (item.order.status === 'shipped') throw new BadRequestException('Cannot modify a shipped order');

    // Delete related manufacturing data for this product in this order
    await this.prisma.$transaction(async (tx) => {
      const mfgOrders = await tx.manufacturingOrder.findMany({
        where: { orderId: item.orderId, productId: item.productId },
        include: { requirements: true },
      });

      // Collect element IDs from requirements being deleted
      const elementIds = new Set<string>();
      for (const mfg of mfgOrders) {
        for (const req of mfg.requirements) {
          elementIds.add(req.elementId);
        }
        await tx.materialRequirement.deleteMany({ where: { manufacturingOrderId: mfg.id } });
      }
      await tx.manufacturingOrder.deleteMany({
        where: { orderId: item.orderId, productId: item.productId },
      });
      await tx.orderItem.delete({ where: { id: orderItemId } });

      // Clean up InventoryAllocation records for elements that are no longer needed
      // Check remaining requirements for this order — only delete allocations for elements
      // that have NO remaining requirements from other products in this order
      const remainingReqs = await tx.materialRequirement.findMany({
        where: { manufacturingOrder: { orderId: item.orderId } },
      });
      const stillNeededElements = new Set(remainingReqs.map(r => r.elementId));

      for (const elementId of elementIds) {
        if (!stillNeededElements.has(elementId)) {
          // No other product in this order needs this element — delete the allocation
          await tx.inventoryAllocation.deleteMany({
            where: { orderId: item.orderId, elementId },
          });
        } else {
          // Element is still needed but possibly in smaller quantity — trim over-allocations
          const totalNeeded = remainingReqs
            .filter(r => r.elementId === elementId)
            .reduce((sum, r) => sum + r.quantityNeeded, 0);
          const allocation = await tx.inventoryAllocation.findUnique({
            where: { orderId_elementId: { orderId: item.orderId, elementId } },
          });
          if (allocation && allocation.amountAllocated > totalNeeded) {
            await tx.inventoryAllocation.update({
              where: { id: allocation.id },
              data: { amountAllocated: totalNeeded },
            });
          }
        }
      }
    });

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: item.orderId },
      include: this.defaultInclude,
    });
    return serialize(updatedOrder);
  }

  async updateOrderItem(orderItemId: string, data: { boxesNeeded: number }) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });
    if (!item) throw new BadRequestException('Order item not found');
    if (item.order.status === 'shipped') throw new BadRequestException('Cannot modify a shipped order');
    if (data.boxesNeeded < 1) throw new BadRequestException('Boxes needed must be at least 1');

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: { boxesNeeded: data.boxesNeeded },
      });

      // If order is in_production, recalculate manufacturing requirements
      if (item.order.status === 'in_production') {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { productElements: { include: { element: true } } },
        });

        const mfgOrder = await tx.manufacturingOrder.findFirst({
          where: { orderId: item.orderId, productId: item.productId },
          include: { requirements: true },
        });

        if (mfgOrder && product) {
          const newBoxesAssembled = item.boxesAssembled ?? 0;
          const boxesStillNeeded = Math.max(0, data.boxesNeeded - newBoxesAssembled);
          const newTotalUnits = boxesStillNeeded * (product.unitsPerBox ?? 1);

          await tx.manufacturingOrder.update({
            where: { id: mfgOrder.id },
            data: { quantityToMake: newTotalUnits },
          });

          for (const pe of product.productElements) {
            const rawQty = pe.quantityNeeded * newTotalUnits;
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

          // Trim over-allocations if requirements shrank
          const allMfgOrders = await tx.manufacturingOrder.findMany({
            where: { orderId: item.orderId },
            include: { requirements: true },
          });
          const elementNeeds = new Map<string, number>();
          for (const mo of allMfgOrders) {
            for (const req of mo.requirements) {
              const cur = elementNeeds.get(req.elementId) ?? 0;
              elementNeeds.set(req.elementId, cur + req.quantityNeeded);
            }
          }

          const orderAllocations = await tx.inventoryAllocation.findMany({
            where: { orderId: item.orderId },
          });
          for (const alloc of orderAllocations) {
            const needed = elementNeeds.get(alloc.elementId) ?? 0;
            if (alloc.amountAllocated > needed) {
              if (needed <= 0) {
                await tx.inventoryAllocation.delete({ where: { id: alloc.id } });
              } else {
                await tx.inventoryAllocation.update({
                  where: { id: alloc.id },
                  data: { amountAllocated: needed },
                });
              }
            }
          }
        }
      }
    });

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: item.orderId },
      include: this.defaultInclude,
    });
    return serialize(updatedOrder);
  }

  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryAllocation.deleteMany({ where: { orderId: id } });
      await tx.materialRequirement.deleteMany({ where: { manufacturingOrder: { orderId: id } } });
      await tx.manufacturingOrder.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });
    return { id };
  }
}
