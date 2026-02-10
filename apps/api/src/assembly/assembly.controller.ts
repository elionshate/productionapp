import { Controller, Get, Post, Body } from '@nestjs/common';
import { AssemblyService } from './assembly.service';

@Controller('assembly')
export class AssemblyController {
  constructor(private readonly assemblyService: AssemblyService) {}

  @Get()
  async getOrders() {
    const data = await this.assemblyService.getOrders();
    return { success: true, data };
  }

  @Get('excess')
  async getExcessAssembly() {
    const data = await this.assemblyService.getExcessAssembly();
    return { success: true, data };
  }

  @Post('record')
  async record(@Body() body: { orderId: string; productId: string; boxesAssembled: number }) {
    const data = await this.assemblyService.record(body);
    return { success: true, data };
  }

  @Post('record-excess')
  async recordExcess(@Body() body: { productId: string; boxes: number }) {
    const data = await this.assemblyService.recordExcessAssembly(body);
    return { success: true, data };
  }
}
