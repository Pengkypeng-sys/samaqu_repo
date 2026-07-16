import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from './bank-account.entity';

@Injectable()
export class BankAccountsService {
  constructor(@InjectRepository(BankAccount) private repo: Repository<BankAccount>) {}

  getAll() { return this.repo.find(); }

  create(dto: Partial<BankAccount>) { return this.repo.save(this.repo.create(dto)); }

  update(id: number, dto: Partial<BankAccount>) { return this.repo.update(id, dto); }

  remove(id: number) { return this.repo.delete(id); }
}
