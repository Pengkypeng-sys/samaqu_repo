import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByApiKey(apiKey: string) {
    return this.repo.findOne({ where: { api_key: apiKey } });
  }

  async create(name: string, email: string, password: string, role: User['role']) {
    const password_hash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ name, email, password_hash, role });
    return this.repo.save(user);
  }
}
