import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AppConfigService } from './app-config.service';

@Controller('config')
export class AppConfigController {
  constructor(private service: AppConfigService) {}

  // Public — keyboard sync tanpa login
  @Get()
  getAll() { return this.service.getAll(); }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(@Body() body: Record<string, string>) { return this.service.setMany(body); }
}
