import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ElementsService } from './elements.service';

@Controller('elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  @Get()
  async findAll() {
    const data = await this.elementsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: {
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
    const data = await this.elementsService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
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
    const data = await this.elementsService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.elementsService.delete(id);
    return { success: true, data };
  }
}
