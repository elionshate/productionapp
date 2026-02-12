import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    productElements: { include: { element: true } },
    productStock: true,
    boxRawMaterial: true,
  };

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: this.defaultInclude,
      orderBy: { serialNumber: 'asc' },
    });
    return serialize(products);
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.defaultInclude,
    });
    return serialize(product);
  }

  async create(data: {
    serialNumber: string;
    category: string;
    label?: string;
    unitsPerAssembly?: number;
    unitsPerBox: number;
    boxRawMaterialId?: string | null;
    imageUrl: string;
  }) {
    try {
      const product = await this.prisma.product.create({
        data: {
          serialNumber: data.serialNumber,
          category: data.category,
          label: data.label ?? '',
          unitsPerAssembly: data.unitsPerAssembly ?? 1,
          unitsPerBox: data.unitsPerBox,
          imageUrl: data.imageUrl,
          boxRawMaterialId: data.boxRawMaterialId ?? null,
        },
      });
      return product;
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new BadRequestException(`A product with serial number "${data.serialNumber}" already exists.`);
      }
      throw err;
    }
  }

  async update(id: string, data: {
    serialNumber?: string;
    category?: string;
    label?: string;
    unitsPerBox?: number;
    boxRawMaterialId?: string | null;
    imageUrl?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.label !== undefined) updateData.label = data.label;
    if (data.unitsPerBox !== undefined) updateData.unitsPerBox = data.unitsPerBox;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.boxRawMaterialId !== undefined) updateData.boxRawMaterialId = data.boxRawMaterialId;

    const product = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: this.defaultInclude,
    });
    return serialize(product);
  }

  async clone(sourceProductId: string, newSerialNumber: string) {
    const source = await this.prisma.product.findUnique({
      where: { id: sourceProductId },
      include: { productElements: true },
    });
    if (!source) {
      throw new NotFoundException('Source product not found');
    }

    const cloned = await this.prisma.product.create({
      data: {
        serialNumber: newSerialNumber,
        category: source.category,
        label: source.label,
        unitsPerAssembly: source.unitsPerAssembly,
        unitsPerBox: source.unitsPerBox,
        imageUrl: source.imageUrl,
        boxRawMaterialId: source.boxRawMaterialId,
        productElements: {
          create: source.productElements.map((pe) => ({
            elementId: pe.elementId,
            quantityNeeded: pe.quantityNeeded,
          })),
        },
      },
      include: this.defaultInclude,
    });

    return serialize(cloned);
  }

  async addElement(data: { productId: string; elementId: string; quantityNeeded: number }) {
    const pe = await this.prisma.productElement.create({
      data: {
        productId: data.productId,
        elementId: data.elementId,
        quantityNeeded: data.quantityNeeded,
      },
      include: { element: true },
    });
    return serialize(pe);
  }

  async removeElement(id: string) {
    // Fetch the product element before deleting to know which product/element is affected
    const pe = await this.prisma.productElement.findUnique({
      where: { id },
      select: { productId: true, elementId: true },
    });

    await this.prisma.productElement.delete({ where: { id } });

    // Recalculate active manufacturing requirements for in-production orders
    if (pe) {
      const activeMfgOrders = await this.prisma.manufacturingOrder.findMany({
        where: {
          productId: pe.productId,
          order: { status: 'in_production' },
        },
        select: { id: true },
      });

      if (activeMfgOrders.length > 0) {
        const mfgIds = activeMfgOrders.map(m => m.id);
        // Delete requirements for this element from active manufacturing orders
        await this.prisma.materialRequirement.deleteMany({
          where: {
            manufacturingOrderId: { in: mfgIds },
            elementId: pe.elementId,
          },
        });
      }
    }

    return { id };
  }

  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      // Collect affected orders before deleting, to clean up allocations
      const affectedItems = await tx.orderItem.findMany({
        where: { productId: id },
        select: { orderId: true },
      });
      const affectedOrderIds = [...new Set(affectedItems.map(i => i.orderId))];

      await tx.materialRequirement.deleteMany({ where: { manufacturingOrder: { productId: id } } });
      await tx.manufacturingOrder.deleteMany({ where: { productId: id } });
      await tx.orderItem.deleteMany({ where: { productId: id } });
      await tx.productStock.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      // Clean up orphaned/over-sized allocations for affected orders
      for (const orderId of affectedOrderIds) {
        const remainingReqs = await tx.materialRequirement.findMany({
          where: { manufacturingOrder: { orderId } },
        });
        const stillNeeded = new Map<string, number>();
        for (const req of remainingReqs) {
          const cur = stillNeeded.get(req.elementId) ?? 0;
          stillNeeded.set(req.elementId, cur + req.quantityNeeded);
        }

        const allocations = await tx.inventoryAllocation.findMany({ where: { orderId } });
        for (const alloc of allocations) {
          const needed = stillNeeded.get(alloc.elementId) ?? 0;
          if (needed <= 0) {
            await tx.inventoryAllocation.delete({ where: { id: alloc.id } });
          } else if (alloc.amountAllocated > needed) {
            await tx.inventoryAllocation.update({
              where: { id: alloc.id },
              data: { amountAllocated: needed },
            });
          }
        }
      }
    });
    return { id };
  }
}
