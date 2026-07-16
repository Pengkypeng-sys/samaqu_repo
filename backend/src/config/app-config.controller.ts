import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AppConfigService } from './app-config.service';

@Controller('config')
export class AppConfigController {
  constructor(private service: AppConfigService) {}

  @Get()
  getAll() { return this.service.getAll(); }

  // APK version check — returns apk_version & apk_url from config
  @Get('version')
  async getVersion() {
    const cfg = await this.service.getAll();
    return {
      version: cfg['apk_version'] || '1.0.0',
      apk_url: cfg['apk_url'] || '',
      changelog: cfg['apk_changelog'] || '',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(@Body() body: Record<string, string>) { return this.service.setMany(body); }
}
