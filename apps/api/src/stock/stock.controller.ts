import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('orders')
  async getOrders() {
    const data = await this.stockService.getOrders();
    return { success: true, data };
  }

  @Get('products')
  async getProductStock() {
    const data = await this.stockService.getProductStock();
    return { success: true, data };
  }

  @Get('products/:productId')
  async getProductStockById(@Param('productId') productId: string) {
    const data = await this.stockService.getProductStockById(productId);
    return { success: true, data };
  }

  @Post('apply-to-order')
  async applyStockToOrder(
    @Body() data: { orderId: string; productId: string; boxes: number },
  ) {
    const result = await this.stockService.applyStockToOrder(data);
    return { success: true, data: result };
  }
}
