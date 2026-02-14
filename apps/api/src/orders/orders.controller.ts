import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
} from './dto/orders.dto';

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
  async create(@Body() body: CreateOrderDto) {
    const data = await this.ordersService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateOrderDto) {
    const data = await this.ordersService.update(id, body);
    return { success: true, data };
  }

  @Post(':id/items')
  async addOrderItem(
    @Param('id') id: string,
    @Body() body: AddOrderItemDto,
  ) {
    const data = await this.ordersService.addOrderItem(id, body);
    return { success: true, data };
  }

  @Put('items/:itemId')
  async updateOrderItem(
    @Param('itemId') itemId: string,
    @Body() body: UpdateOrderItemDto,
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
