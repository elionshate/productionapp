import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';

@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Get()
  async findAll() {
    const data = await this.manufacturingService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.manufacturingService.findById(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: { orderId: string; productId: string; quantityToMake: number }) {
    const data = await this.manufacturingService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { status?: string }) {
    const data = await this.manufacturingService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.manufacturingService.delete(id);
    return { success: true, data };
  }

  @Get(':id/requirements')
  async getRequirements(@Param('id') id: string) {
    const data = await this.manufacturingService.getRequirements(id);
    return { success: true, data };
  }

  @Post(':id/generate-requirements')
  async generateRequirements(@Param('id') id: string) {
    const data = await this.manufacturingService.generateRequirements(id);
    return { success: true, data };
  }
}
