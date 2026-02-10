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
    await this.prisma.productElement.delete({ where: { id } });
    return { id };
  }

  async delete(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.materialRequirement.deleteMany({ where: { manufacturingOrder: { productId: id } } });
      await tx.manufacturingOrder.deleteMany({ where: { productId: id } });
      await tx.orderItem.deleteMany({ where: { productId: id } });
      await tx.productStock.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    return { id };
  }
}
