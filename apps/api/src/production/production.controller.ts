import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProductionService } from './production.service';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  async getInProduction() {
    const data = await this.productionService.getInProduction();
    return { success: true, data };
  }

  @Post('record')
  async recordProduction(@Body() body: { orderId: string; elementId: string; amountProduced: number }) {
    const data = await this.productionService.recordProduction(body);
    return { success: true, data };
  }

  @Post('apply-inventory')
  async applyInventoryToOrder(@Body() body: { orderId: string }) {
    const data = await this.productionService.applyInventoryToOrder(body.orderId);
    return { success: true, data };
  }
}
