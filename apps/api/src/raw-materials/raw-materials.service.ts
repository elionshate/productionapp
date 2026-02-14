import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class RawMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const materials = await this.prisma.rawMaterial.findMany({ orderBy: { name: 'asc' } });
    return serialize(materials);
  }

  async create(data: { name: string; unit: string }) {
    try {
      const material = await this.prisma.rawMaterial.create({
        data: { name: data.name, unit: data.unit ?? 'g', stockQty: 0 },
      });
      return serialize(material);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new BadRequestException(`A raw material named "${data.name}" already exists.`);
      }
      throw err;
    }
  }

  async update(id: string, data: { name?: string; unit?: string }) {
    try {
      const material = await this.prisma.rawMaterial.update({
        where: { id },
        data: { name: data.name, unit: data.unit },
      });
      return serialize(material);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new BadRequestException(`A raw material named "${data.name}" already exists.`);
      }
      throw err;
    }
  }

  async delete(id: string) {
    const elementCount = await this.prisma.element.count({ where: { rawMaterialId: id } });
    const productCount = await this.prisma.product.count({ where: { boxRawMaterialId: id } });
    if (elementCount > 0 || productCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${elementCount} element(s) and ${productCount} product(s) still reference this material.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.rawMaterialTransaction.deleteMany({ where: { rawMaterialId: id } });
      await tx.rawMaterial.delete({ where: { id } });
    });
    return { id };
  }

  async adjustStock(data: { rawMaterialId: string; changeAmount: number; reason?: string }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.update({
        where: { id: data.rawMaterialId },
        data: { stockQty: { increment: data.changeAmount } },
      });

      if (material.stockQty < 0) {
        throw new BadRequestException('Adjustment would result in negative stock');
      }

      await tx.rawMaterialTransaction.create({
        data: {
          rawMaterialId: data.rawMaterialId,
          changeAmount: data.changeAmount,
          reason: data.reason ?? (data.changeAmount >= 0 ? 'Manual stock addition' : 'Manual stock deduction'),
        },
      });
      return material;
    });
    return serialize(result);
  }

  async getTransactions(rawMaterialId?: string, skip = 0, take = 200) {
    const transactions = await this.prisma.rawMaterialTransaction.findMany({
      where: rawMaterialId ? { rawMaterialId } : undefined,
      include: { rawMaterial: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return serialize(transactions);
  }
}
