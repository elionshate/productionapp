import { Controller, Get, Param } from '@nestjs/common';
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
}
