import { Controller, Get, Post, Body } from '@nestjs/common';
import { AssemblyService } from './assembly.service';
import { RecordAssemblyDto, RecordExcessDto } from './dto/assembly.dto';

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
  async record(@Body() body: RecordAssemblyDto) {
    const data = await this.assemblyService.record(body);
    return { success: true, data };
  }

  @Post('record-excess')
  async recordExcess(@Body() body: RecordExcessDto) {
    const data = await this.assemblyService.recordExcessAssembly(body);
    return { success: true, data };
  }
}
