import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ElementsService } from './elements.service';
import { CreateElementDto, UpdateElementDto } from './dto/elements.dto';

@Controller('elements')
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  @Get()
  async findAll() {
    const data = await this.elementsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateElementDto) {
    const data = await this.elementsService.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateElementDto) {
    const data = await this.elementsService.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const data = await this.elementsService.delete(id);
    return { success: true, data };
  }
}
