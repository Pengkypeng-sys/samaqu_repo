import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from './app-config.entity';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  providers: [AppConfigService],
  controllers: [AppConfigController],
})
export class AppConfigModule {}
