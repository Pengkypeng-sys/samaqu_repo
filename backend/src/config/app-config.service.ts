import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './app-config.entity';

@Injectable()
export class AppConfigService {
  constructor(@InjectRepository(AppConfig) private repo: Repository<AppConfig>) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async set(key: string, value: string) {
    await this.repo.save({ key, value });
  }

  async setMany(entries: Record<string, string>) {
    await Promise.all(Object.entries(entries).map(([k, v]) => this.set(k, v)));
    return this.getAll();
  }
}
