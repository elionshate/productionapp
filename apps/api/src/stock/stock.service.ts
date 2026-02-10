import { Injectable } from '@nestjs/common';
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
}
