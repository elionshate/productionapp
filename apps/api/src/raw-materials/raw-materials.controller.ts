import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { RawMaterialsService } from './raw-materials.service';

@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private readonly service: RawMaterialsService) {}

  @Get()
  async findAll() {
    return { success: true, data: await this.service.findAll() };
  }

  @Post()
  async create(@Body() body: { name: string; unit: string }) {
    return { success: true, data: await this.service.create(body) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; unit?: string }) {
    return { success: true, data: await this.service.update(id, body) };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return { success: true, data: await this.service.delete(id) };
  }

  @Post('adjust')
  async adjustStock(@Body() body: { rawMaterialId: string; changeAmount: number; reason?: string }) {
    return { success: true, data: await this.service.adjustStock(body) };
  }

  @Get('transactions')
  async getTransactions(@Query('rawMaterialId') rawMaterialId?: string) {
    return { success: true, data: await this.service.getTransactions(rawMaterialId) };
  }
}
