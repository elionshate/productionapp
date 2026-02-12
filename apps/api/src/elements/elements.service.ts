import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma-db/prisma.service';
import { serialize } from '../common/serialize.util';

@Injectable()
export class ElementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const elements = await this.prisma.element.findMany({
      include: { rawMaterial: true },
      orderBy: { uniqueName: 'asc' },
    });
    return serialize(elements);
  }

  /** Capitalize the first letter of a string (for consistent color/label storage) */
  private capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async create(data: {
    uniqueName: string;
    label?: string;
    color: string;
    color2?: string | null;
    isDualColor?: boolean;
    material: string;
    rawMaterialId?: string | null;
    weightGrams: number;
    imageUrl?: string;
  }) {
    const element = await this.prisma.element.create({
      data: {
        uniqueName: data.uniqueName,
        label: data.label ? this.capitalize(data.label.trim()) : '',
        color: this.capitalize(data.color.trim()),
        color2: data.color2 ? this.capitalize(data.color2.trim()) : null,
        isDualColor: data.isDualColor ?? false,
        material: data.material,
        weightGrams: data.weightGrams,
        imageUrl: data.imageUrl,
        rawMaterialId: data.rawMaterialId ?? null,
      },
      include: { rawMaterial: true },
    });
    return serialize(element);
  }

  /**
   * Update element - BUG FIX: previously the update would fail silently
   * because undefined fields were passed through and Prisma would try to
   * set them to undefined (no-op in some adapters, error in others).
   * Fix: only include fields that are explicitly provided (not undefined).
   */
  async update(id: string, data: {
    uniqueName?: string;
    label?: string;
    color?: string;
    color2?: string | null;
    isDualColor?: boolean;
    material?: string;
    rawMaterialId?: string | null;
    weightGrams?: number;
    imageUrl?: string | null;
  }) {
    // Build update payload with only defined fields
    const updateData: Record<string, unknown> = {};
    if (data.uniqueName !== undefined) updateData.uniqueName = data.uniqueName;
    if (data.label !== undefined) updateData.label = data.label ? this.capitalize(data.label.trim()) : data.label;
    if (data.color !== undefined) updateData.color = this.capitalize(data.color.trim());
    if (data.color2 !== undefined) updateData.color2 = data.color2 ? this.capitalize(data.color2.trim()) : data.color2;
    if (data.isDualColor !== undefined) updateData.isDualColor = data.isDualColor;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.rawMaterialId !== undefined) updateData.rawMaterialId = data.rawMaterialId;
    if (data.weightGrams !== undefined) updateData.weightGrams = data.weightGrams;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const element = await this.prisma.element.update({
      where: { id },
      data: updateData,
      include: { rawMaterial: true },
    });
    return serialize(element);
  }

  async delete(id: string) {
    const usageCount = await this.prisma.productElement.count({ where: { elementId: id } });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete: element is used in ${usageCount} product(s). Remove it from all products first.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryAllocation.deleteMany({ where: { elementId: id } });
      await tx.inventoryTransaction.deleteMany({ where: { elementId: id } });
      await tx.inventory.deleteMany({ where: { elementId: id } });
      await tx.materialRequirement.deleteMany({ where: { elementId: id } });
      await tx.element.delete({ where: { id } });
    });
    return { id };
  }
}
