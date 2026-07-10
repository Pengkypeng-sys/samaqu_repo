import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { ScriptTemplate } from './script-template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(ScriptTemplate) private templates: Repository<ScriptTemplate>,
  ) {}

  getAll() {
    return this.categories.find({ relations: { templates: true } });
  }

  async create(categoryId: number, content: string, userId: number) {
    const category = await this.categories.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    return this.templates.save(
      this.templates.create({ category, content, created_by: { id: userId } as any }),
    );
  }

  async update(id: number, content: string) {
    const tpl = await this.templates.findOne({ where: { id } });
    if (!tpl) throw new NotFoundException('Template tidak ditemukan');
    tpl.content = content;
    return this.templates.save(tpl);
  }

  async remove(id: number) {
    await this.templates.delete(id);
  }

  createCategory(name: string) {
    return this.categories.save(this.categories.create({ name }));
  }
}
