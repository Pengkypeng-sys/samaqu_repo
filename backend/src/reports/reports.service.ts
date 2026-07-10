import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItem) private items: Repository<OrderItem>,
  ) {}

  async summary(from: Date, to: Date) {
    const completed = await this.orders.find({
      where: { status: OrderStatus.SELESAI, created_at: Between(from, to) },
      relations: { cs: true },
    });
    const revenue = completed.reduce((s, o) => s + Number(o.total_price), 0);
    const byCs: Record<string, { count: number; revenue: number }> = {};
    for (const o of completed) {
      const key = o.cs?.name ?? 'unknown';
      byCs[key] ??= { count: 0, revenue: 0 };
      byCs[key].count++;
      byCs[key].revenue += Number(o.total_price);
    }
    return { total_orders: completed.length, revenue, by_cs: byCs };
  }
}
