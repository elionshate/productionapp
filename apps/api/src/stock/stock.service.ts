import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'in_production' },
      include: { orderItems: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const result = orders.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientName: order.clientName,
      createdAt: order.createdAt,
      status: order.status,
      products: order.orderItems.map((item) => ({
        productId: item.productId,
        serialNumber: item.product?.serialNumber ?? 'Unknown',
        imageUrl: item.product?.imageUrl ?? null,
        category: item.product?.category ?? '',
        boxesNeeded: item.boxesNeeded,
        boxesReady: item.boxesAssembled,
        unitsPerBox: item.product?.unitsPerBox ?? 1,
      })),
    }));

    return serialize(result);
  }

  async getProductStock() {
    const stock = await this.prisma.productStock.findMany({
      include: { product: true },
      orderBy: { product: { serialNumber: 'asc' } },
    });
    return stock;
  }

  async getProductStockById(productId: string) {
    const stock = await this.prisma.productStock.findUnique({
      where: { productId },
      include: { product: true },
    });
    return stock;
  }

  /**
   * Manually apply excess stock boxes to an order item.
   * Decrements ProductStock and increments orderItem.boxesAssembled.
   */
  async applyStockToOrder(data: { orderId: string; productId: string; boxes: number }) {
    const { orderId, productId, boxes } = data;

    if (boxes <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Validate order exists and is in_production
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status !== 'in_production') {
      throw new BadRequestException('Can only apply stock to orders in production');
    }

    // Find the order item
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { orderId, productId },
    });
    if (!orderItem) {
      throw new BadRequestException('Order item not found for this product');
    }

    // Check remaining needed
    const remaining = orderItem.boxesNeeded - orderItem.boxesAssembled;
    if (remaining <= 0) {
      throw new BadRequestException('This product is already fully assembled for this order');
    }
    if (boxes > remaining) {
      throw new BadRequestException(`Cannot apply more than remaining needed (${remaining})`);
    }

    // Check available stock
    const stock = await this.prisma.productStock.findUnique({
      where: { productId },
    });
    if (!stock || stock.stockBoxedAmount <= 0) {
      throw new BadRequestException('No excess stock available for this product');
    }
    if (boxes > stock.stockBoxedAmount) {
      throw new BadRequestException(`Not enough stock. Available: ${stock.stockBoxedAmount}`);
    }

    // Fetch product with its elements so we can recalculate requirements
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { productElements: { include: { element: true } } },
    });

    // Apply in a transaction: update stock + recalculate manufacturing requirements
    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { boxesAssembled: { increment: boxes } },
      });
      await tx.productStock.update({
        where: { productId },
        data: { stockBoxedAmount: { decrement: boxes } },
      });

      // Recalculate manufacturing order requirements to reflect stock applied
      const mfgOrder = await tx.manufacturingOrder.findFirst({
        where: { orderId, productId },
        include: { requirements: true },
      });

      if (mfgOrder && product) {
        const newBoxesAssembled = orderItem.boxesAssembled + boxes;
        const boxesStillNeeded = Math.max(0, orderItem.boxesNeeded - newBoxesAssembled);
        const newTotalUnits = boxesStillNeeded * (product.unitsPerBox ?? 1);

        // Update the manufacturing order quantity
        await tx.manufacturingOrder.update({
          where: { id: mfgOrder.id },
          data: { quantityToMake: newTotalUnits },
        });

        // Recalculate each material requirement
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
      }
    });

    return serialize({
      orderId,
      productId,
      boxesApplied: boxes,
      newBoxesAssembled: orderItem.boxesAssembled + boxes,
      newStockAmount: stock.stockBoxedAmount - boxes,
    });
  }
}
