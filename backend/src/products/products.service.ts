import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  search(q?: string) {
    return this.repo.find({
      where: q ? [{ name: ILike(`%${q}%`) }, { series: ILike(`%${q}%`) }] : undefined,
      order: { name: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<Product>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Product>) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async decrementStock(id: number, size: string | null, qty: number, manager?: any) {
    const repo = manager ? manager.getRepository(Product) : this.repo;
    const product = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!product) throw new NotFoundException('Produk tidak ditemukan');
    if (size && product.size_variants) {
      if ((product.size_variants[size] ?? 0) < qty) throw new Error(`Stok size ${size} tidak cukup`);
      product.size_variants[size] -= qty;
    } else {
      if (product.stock_qty < qty) throw new Error('Stok tidak cukup');
      product.stock_qty -= qty;
    }
    return repo.save(product);
  }
}
