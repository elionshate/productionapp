import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll() {
    const data = await this.productsService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.productsService.findById(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: {
    serialNumber: string;
    category: string;
    label?: string;
    unitsPerAssembly?: number;
    unitsPerBox: number;
    boxRawMaterialId?: string | null;
    imageUrl: string;
  }) {
    const data = await this.productsService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: {
    serialNumber?: string;
    category?: string;
    label?: string;
    unitsPerBox?: number;
    boxRawMaterialId?: string | null;
    imageUrl?: string;
  }) {
    const data = await this.productsService.update(id, body);
    return { success: true, data };
  }

  @Post('clone')
  async clone(@Body() body: { sourceProductId: string; newSerialNumber: string }) {
    const data = await this.productsService.clone(body.sourceProductId, body.newSerialNumber);
    return { success: true, data };
  }

  @Post('add-element')
  async addElement(@Body() body: { productId: string; elementId: string; quantityNeeded: number }) {
    const data = await this.productsService.addElement(body);
    return { success: true, data };
  }

  @Delete('remove-element/:id')
  async removeElement(@Param('id') id: string) {
    const data = await this.productsService.removeElement(id);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.productsService.delete(id);
    return { success: true, data };
  }
}
