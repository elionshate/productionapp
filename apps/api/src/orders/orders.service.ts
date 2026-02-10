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

    // Auto-deduct from existing product stock (excess assembly)
    if (status === 'in_production') {
      await this.autoDeductProductStock(orderId);
    }

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
      await this.autoDeductProductStock(id);
      await this.prisma.$transaction(async (tx) => {
        await generateManufacturingOrders(tx, id, order.orderItems);
      });
    }

    // When shipping, deduct assembled boxes from product_stock
    if (data.status === 'shipped' && order.orderItems) {
      await this.deductProductStockOnShip(id);
    }

    // Re-fetch to reflect auto-deduction changes
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    return serialize(updatedOrder);
  }

  /**
   * Auto-deduct from existing product stock when an order goes into production.
   * If a product already has boxes in stock (from excess assembly), apply them
   * to the order items and decrement the stock.
   */
  private async autoDeductProductStock(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    for (const item of orderItems) {
      const stock = await this.prisma.productStock.findUnique({
        where: { productId: item.productId },
      });
      if (!stock || stock.stockBoxedAmount <= 0) continue;

      const remaining = item.boxesNeeded - item.boxesAssembled;
      if (remaining <= 0) continue;

      const toApply = Math.min(stock.stockBoxedAmount, remaining);
      await this.prisma.$transaction(async (tx) => {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { boxesAssembled: { increment: toApply } },
        });
        await tx.productStock.update({
          where: { productId: item.productId },
          data: { stockBoxedAmount: { decrement: toApply } },
        });
      });
    }
  }

  /**
   * Deduct assembled boxes from product_stock when an order is shipped.
   * The assembled boxes are leaving the warehouse, so remove them from stock.
   */
  private async deductProductStockOnShip(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId },
    });

    for (const item of orderItems) {
      if (item.boxesAssembled <= 0) continue;
      const stock = await this.prisma.productStock.findUnique({
        where: { productId: item.productId },
      });
      if (!stock || stock.stockBoxedAmount <= 0) continue;

      const toDeduct = Math.min(stock.stockBoxedAmount, item.boxesAssembled);
      await this.prisma.productStock.update({
        where: { productId: item.productId },
        data: { stockBoxedAmount: { decrement: toDeduct } },
      });
    }
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
      const totalUnits = item.boxesNeeded * (item.product.unitsPerBox ?? 1);

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
          existing.totalNeeded += item.boxesNeeded;
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

  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.materialRequirement.deleteMany({ where: { manufacturingOrder: { orderId: id } } });
      await tx.manufacturingOrder.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });
    return { id };
  }
}
