import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { ScriptTemplate } from './script-template.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Category, ScriptTemplate])],
  providers: [TemplatesService],
  controllers: [TemplatesController],
})
export class TemplatesModule {}
