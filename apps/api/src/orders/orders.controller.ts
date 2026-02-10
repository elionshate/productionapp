import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll() {
    const data = await this.ordersService.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.ordersService.findById(id);
    return { success: true, data };
  }

  @Get(':id/material-check')
  async checkMaterialAvailability(@Param('id') id: string) {
    const data = await this.ordersService.checkMaterialAvailability(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: {
    clientName: string;
    status?: string;
    notes?: string;
    items: Array<{ productId: string; boxesNeeded: number }>;
  }) {
    const data = await this.ordersService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { status?: string; notes?: string }) {
    const data = await this.ordersService.update(id, body);
    return { success: true, data };
  }

  @Post(':id/items')
  async addOrderItem(
    @Param('id') id: string,
    @Body() body: { productId: string; boxesNeeded: number },
  ) {
    const data = await this.ordersService.addOrderItem(id, body);
    return { success: true, data };
  }

  @Put('items/:itemId')
  async updateOrderItem(
    @Param('itemId') itemId: string,
    @Body() body: { boxesNeeded: number },
  ) {
    const data = await this.ordersService.updateOrderItem(itemId, body);
    return { success: true, data };
  }

  @Delete('items/:itemId')
  async removeOrderItem(@Param('itemId') itemId: string) {
    const data = await this.ordersService.removeOrderItem(itemId);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.ordersService.delete(id);
    return { success: true, data };
  }
}
