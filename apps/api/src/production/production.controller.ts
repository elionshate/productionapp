import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProductionService } from './production.service';
import { RecordProductionDto, ApplyInventoryDto } from './dto/production.dto';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  async getInProduction() {
    const data = await this.productionService.getInProduction();
    return { success: true, data };
  }

  @Post('record')
  async recordProduction(@Body() body: RecordProductionDto) {
    const data = await this.productionService.recordProduction(body);
    return { success: true, data };
  }

  @Post('apply-inventory')
  async applyInventoryToOrder(@Body() body: ApplyInventoryDto) {
    const data = await this.productionService.applyInventoryToOrder(body.orderId);
    return { success: true, data };
  }
}
