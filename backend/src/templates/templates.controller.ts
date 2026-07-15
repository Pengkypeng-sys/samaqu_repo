import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { IsNumber, IsString } from 'class-validator';

class CreateTemplateDto {
  @IsNumber() category_id: number;
  @IsString() content: string;
}
class UpdateTemplateDto {
  @IsString() content: string;
}

@Controller('templates')
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  // Public — keyboard sync tanpa login
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: any) {
    return this.service.create(dto.category_id, dto.content, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(+id, dto.content);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('categories')
  createCategory(@Body('name') name: string) {
    return this.service.createCategory(name);
  }
}
