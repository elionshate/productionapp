import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll() {
    const data = await this.inventoryService.findAll();
    return { success: true, data };
  }

  @Get('transactions')
  async getTransactions(@Query('skip') skip?: string, @Query('take') take?: string) {
    const data = await this.inventoryService.getTransactions(
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
    return { success: true, data };
  }

  @Get('by-element/:elementId')
  async findByElement(@Param('elementId') elementId: string) {
    const data = await this.inventoryService.findByElement(elementId);
    return { success: true, data };
  }

  @Post('adjust')
  async adjust(@Body() body: AdjustInventoryDto) {
    const data = await this.inventoryService.adjust(body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.inventoryService.delete(id);
    return { success: true, data };
  }
}
