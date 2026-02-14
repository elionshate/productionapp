import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class ManufacturingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const orders = await this.prisma.manufacturingOrder.findMany({
      include: {
        product: true,
        order: true,
        requirements: { include: { element: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return serialize(orders);
  }

  async findById(id: string) {
    const order = await this.prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: { include: { productElements: { include: { element: true } } } },
        order: true,
        requirements: { include: { element: true } },
      },
    });
    return serialize(order);
  }

  async create(data: { orderId: string; productId: string; quantityToMake: number }) {
    const order = await this.prisma.manufacturingOrder.create({
      data: {
        orderId: data.orderId,
        productId: data.productId,
        quantityToMake: data.quantityToMake,
      },
      include: { product: true, order: true },
    });
    return serialize(order);
  }

  async update(id: string, data: { status?: string }) {
    const order = await this.prisma.manufacturingOrder.update({
      where: { id },
      data: { status: data.status },
      include: { product: true, order: true },
    });
    return serialize(order);
  }

  async delete(id: string) {
    await this.prisma.manufacturingOrder.delete({ where: { id } });
    return { id };
  }

  async getRequirements(manufacturingOrderId: string) {
    const requirements = await this.prisma.materialRequirement.findMany({
      where: { manufacturingOrderId },
      include: { element: true },
      orderBy: [{ element: { uniqueName: 'asc' } }],
    });
    return serialize(requirements);
  }

  async generateRequirements(manufacturingOrderId: string) {
    const mfgOrder = await this.prisma.manufacturingOrder.findUnique({
      where: { id: manufacturingOrderId },
      include: {
        product: { include: { productElements: { include: { element: true } } } },
      },
    });

    if (!mfgOrder) {
      throw new NotFoundException('Manufacturing order not found');
    }

    const requirementsData = mfgOrder.product.productElements.map((pe) => {
      const rawQty = pe.quantityNeeded * mfgOrder.quantityToMake;
      const quantityNeeded = pe.element.isDualColor ? Math.ceil(rawQty / 2) : rawQty;
      const totalWeightGrams = Number(pe.element.weightGrams) * quantityNeeded;
      return { manufacturingOrderId, elementId: pe.elementId, quantityNeeded, totalWeightGrams };
    });

    // Sequential upserts to avoid deadlock risk from parallel writes on same table
    const requirements = [];
    for (const req of requirementsData) {
      const result = await this.prisma.materialRequirement.upsert({
        where: {
          manufacturingOrderId_elementId: {
            manufacturingOrderId: req.manufacturingOrderId,
            elementId: req.elementId,
          },
        },
        create: req,
        update: { quantityNeeded: req.quantityNeeded, totalWeightGrams: req.totalWeightGrams },
        include: { element: true },
      });
      requirements.push(result);
    }

    return serialize(requirements);
  }
}
